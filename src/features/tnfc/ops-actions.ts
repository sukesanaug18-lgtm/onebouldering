"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { canonicalDivision } from "@/domain/division";
import { assignBibNumbers, planSessionGroups, tnfcControlCategory } from "@/domain/tnfc";
import {
  aggregateFinalists,
  CANCEL_TYPES,
  cancelReply,
  CONTACT_CHANNELS,
  declineReply,
  FINALS_ROUND_NUMBER,
  finalsPromotions,
  isFinalsRound,
  moveReply,
} from "@/domain/tnfc-finals";
import { getAdminVenue } from "@/features/venue/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getAdmin } from "@/server/admin-session";
import { adminDb } from "@/server/firebase-admin";
import { rebuildRankingCache } from "@/server/ranking-cache";
import { syncTnfcEntries } from "@/server/tnfc-sync";
import {
  getMembers,
  getRound,
  getRoundEntries,
  getRoundResults,
  getSeasonQualifierResults,
  ROUND_ID,
} from "./queries";

// Office work for cancellations and venue changes (diagram B-8 1.6.1–1.6.2, B-5 1.2.3) and the
// finals (diagram B-6 1.3–1.4). Each action writes admin_logs and, where the player contacted
// the office, returns a reply to send through the same channel.

export type OpsState = { ok?: boolean; message?: string; reply?: string };

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";
const FAILED = "保存できませんでした。時間をおいて、もう一度お試しください。";
const BATCH = 400;
const id = z.string().regex(ROUND_ID);
const channel = z.enum(Object.keys(CONTACT_CHANNELS) as [keyof typeof CONTACT_CHANNELS]);

async function log(action: string, by: string, detail: Record<string, unknown>) {
  await adminDb()
    .collection("admin_logs")
    .add({ action, by, at: new Date().toISOString(), ...detail });
}

class UserError extends Error {}

const CancelSchema = z.object({
  entryId: id,
  cancelType: z.enum(Object.keys(CANCEL_TYPES) as [keyof typeof CANCEL_TYPES]),
  amount: z.coerce.number().int().min(0).max(1_000_000),
  channel,
  note: z.string().trim().max(200),
});

/** 1.6.1 / 1.2.3 Cancels an entry and writes the refund / cancellation-fee ledger. */
export async function cancelEntry(_prev: OpsState, formData: FormData): Promise<OpsState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = CancelSchema.safeParse({
    entryId: formData.get("entryId"),
    cancelType: formData.get("cancelType"),
    amount: formData.get("amount") || 0,
    channel: formData.get("channel"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { message: "選手と区分を選んでください。金額は数字で入力します。" };
  const v = parsed.data;
  const db = adminDb();
  const ref = db.collection("tnfc_entries").doc(v.entryId);
  const now = new Date().toISOString();
  try {
    const e = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new UserError("エントリーが見つかりません。");
      const d = snap.data()!;
      if (d.status === "cancelled") throw new UserError("この人はすでにキャンセル済みです。");
      tx.update(ref, { status: "cancelled", cancelledAt: now, updatedAt: now });
      tx.set(db.collection("tnfc_cancellations").doc(), {
        seasonId: String(d.seasonId ?? CURRENT_SEASON_ID),
        roundId: String(d.roundId ?? ""),
        roundName: String(d.roundName ?? ""),
        entryId: v.entryId,
        userId: String(d.userId ?? ""),
        userName: String(d.currentUserName || d.registeredName || ""),
        division: String(d.division ?? ""),
        zeusOrderNo: String(d.zeusOrderNo ?? ""),
        cancelType: v.cancelType,
        amount: v.amount,
        contactChannel: v.channel,
        note: v.note,
        processedAt: now,
        by: admin.email,
      });
      return d;
    });
    await log("tnfc_entry_cancel", admin.email, {
      roundId: e.roundId,
      entryId: v.entryId,
      cancelType: v.cancelType,
      amount: v.amount,
    });
    revalidatePath(`/admin/tnfc/${e.roundId}`, "layout");
    revalidatePath("/admin/tnfc/cancellations");
    return {
      ok: true,
      message: `${e.currentUserName || e.registeredName} さんをキャンセルにし、台帳に記録しました。${e.bibNo ? "ゼッケン採番済みなので、受付表と TNFC Control の出し直しが必要です。" : ""}`,
      reply: cancelReply({
        name: String(e.currentUserName || e.registeredName),
        roundName: String(e.roundName),
        venueName: String(e.venueName),
        type: v.cancelType,
        amount: v.amount,
      }),
    };
  } catch (err) {
    if (err instanceof UserError) return { message: err.message };
    console.error("[tnfc] cancel failed", err);
    return { message: FAILED };
  }
}

/** 1.6.2 Moves an entry to another qualifier round (bib and group are cleared). */
export async function moveEntry(_prev: OpsState, formData: FormData): Promise<OpsState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = z
    .object({ entryId: id, targetRoundId: id })
    .safeParse({ entryId: formData.get("entryId"), targetRoundId: formData.get("targetRoundId") });
  if (!parsed.success) return { message: "選手と移動先の予選を選んでください。" };
  const target = await getRound(parsed.data.targetRoundId);
  if (!target || isFinalsRound(target)) return { message: "移動先の予選が見つかりません。" };

  const db = adminDb();
  const from = db.collection("tnfc_entries").doc(parsed.data.entryId);
  const now = new Date().toISOString();
  try {
    const { d, to } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(from);
      if (!snap.exists) throw new UserError("エントリーが見つかりません。");
      const d = snap.data()!;
      if (d.status === "cancelled") throw new UserError("キャンセル済みの人は移動できません。");
      if (d.roundId === target.id) throw new UserError("同じ予選が選ばれています。");
      const to = db.collection("tnfc_entries").doc(`${target.id}_${d.userId}`);
      const existing = await tx.get(to);
      if (existing.exists && existing.data()!.status !== "cancelled") {
        throw new UserError("移動先の予選に、この人のエントリーがすでにあります。");
      }
      tx.set(to, {
        ...d,
        roundId: target.id,
        roundName: target.roundName,
        venueId: target.venueId,
        venueName: target.venueName,
        bibNo: null,
        sessionGroup: "",
        movedFromRoundId: d.roundId,
        movedAt: now,
        updatedAt: now,
      });
      tx.delete(from);
      return { d, to };
    });
    const active = (await getRoundEntries(target.id)).filter((e) => e.status !== "cancelled");
    await log("tnfc_entry_move", admin.email, {
      roundId: d.roundId,
      targetRoundId: target.id,
      entryId: parsed.data.entryId,
      newEntryId: to.id,
    });
    revalidatePath(`/admin/tnfc/${d.roundId}`, "layout");
    revalidatePath(`/admin/tnfc/${target.id}`, "layout");
    const over = target.capacity > 0 && active.length > target.capacity;
    return {
      ok: true,
      message: [
        `${d.currentUserName || d.registeredName} さんを ${target.venueName} に移しました。`,
        over ? `移動先は定員（${target.capacity}人）を超えています（${active.length}人）。` : "",
        target.lastBibNo != null
          ? "移動先はゼッケン採番済みなので、採番をやり直してください。"
          : "",
        "旧サイトを使っている間は、旧サイトの申込の会場・会場の定員・カテゴリー定員も直してください。",
      ]
        .filter(Boolean)
        .join(" "),
      reply: moveReply({
        name: String(d.currentUserName || d.registeredName),
        fromVenue: String(d.venueName),
        toRoundName: target.roundName,
        toVenue: target.venueName,
        toDate: target.eventDate,
      }),
    };
  } catch (err) {
    if (err instanceof UserError) return { message: err.message };
    console.error("[tnfc] move failed", err);
    return { message: FAILED };
  }
}

/**
 * 1.3 A finalist declines. Optionally moves the next player of the same round and category up
 * (with a notification). The finals entry, if already made, is cancelled.
 */
export async function declineFinalist(_prev: OpsState, formData: FormData): Promise<OpsState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const resultId = String(formData.get("resultId") ?? "");
  const promoteId = String(formData.get("promoteId") ?? "");
  if (!ROUND_ID.test(resultId) || (promoteId && !ROUND_ID.test(promoteId))) {
    return { message: "選手が見つかりません。" };
  }
  const db = adminDb();
  const now = new Date().toISOString();
  const finalsId = `tnfc${CURRENT_SEASON_ID}_finals`;
  try {
    const { r, promoted } = await db.runTransaction(async (tx) => {
      const ref = db.collection("tnfc_results").doc(resultId);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new UserError("選手が見つかりません。");
      const r = snap.data()!;
      if (r.status === "cancelled_finals") throw new UserError("すでに辞退済みです。");
      const pRef = promoteId ? db.collection("tnfc_results").doc(promoteId) : null;
      const pSnap = pRef ? await tx.get(pRef) : null;
      const p = pSnap?.exists ? pSnap.data()! : null;
      if (pRef && (!p || p.roundId !== r.roundId || p.qualifiedForFinals)) {
        throw new UserError("繰り上げる選手が見つかりません。画面を開き直してください。");
      }
      const finalsEntry = db.collection("tnfc_entries").doc(`${finalsId}_${r.userId}`);
      const fe = await tx.get(finalsEntry);

      tx.update(ref, { status: "cancelled_finals", qualifiedForFinals: false, updatedAt: now });
      if (fe.exists && fe.data()!.status !== "cancelled") {
        tx.update(finalsEntry, { status: "cancelled", cancelledAt: now, updatedAt: now });
      }
      tx.set(db.collection("tnfc_cancellations").doc(), {
        seasonId: String(r.seasonId ?? CURRENT_SEASON_ID),
        roundId: String(r.roundId),
        roundName: `${r.roundName}（本戦辞退）`,
        userId: String(r.userId),
        userName: String(r.userName ?? ""),
        division: String(r.division ?? ""),
        zeusOrderNo: "",
        cancelType: "free_cancel",
        amount: 0,
        contactChannel: String(formData.get("channel") ?? "admin"),
        note: p ? `本戦辞退（次点 ${p.userName} さんを繰り上げ）` : "本戦辞退",
        processedAt: now,
        by: admin.email,
      });
      if (pRef && p) {
        tx.update(pRef, { qualifiedForFinals: true, promotedToFinals: true, updatedAt: now });
        tx.set(db.collection("notifications").doc(`notif_${randomUUID()}`), {
          seasonId: String(p.seasonId ?? CURRENT_SEASON_ID),
          userId: String(p.userId),
          type: "tnfc_finals_promoted",
          title: "TNFC 本戦 繰り上げ出場のお知らせ",
          message: `${p.roundName}（${p.venueName}・${canonicalDivision(String(p.division))} ${p.rank}位）で、上位の選手の辞退により本戦に出場できることになりました。`,
          read: false,
          createdAt: now,
        });
      }
      return { r, promoted: p };
    });
    await log("tnfc_finals_decline", admin.email, {
      roundId: r.roundId,
      userId: r.userId,
      promotedUserId: promoted?.userId ?? null,
    });
    revalidatePath("/admin/tnfc/finals");
    return {
      ok: true,
      message: promoted
        ? `${r.userName} さんの辞退を記録し、${promoted.userName} さんを繰り上げました（本人に通知しました）。本戦エントリーを作り直してください。`
        : `${r.userName} さんの辞退を記録しました。`,
      reply: declineReply({ name: String(r.userName), seasonId: String(r.seasonId) }),
    };
  } catch (err) {
    if (err instanceof UserError) return { message: err.message };
    console.error("[tnfc] decline failed", err);
    return { message: FAILED };
  }
}

export type FinalsFormState = OpsState & { errors?: Partial<Record<string, string[]>> };

const FinalsSchema = z.object({
  venueId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, { error: "会場を選んでください。" }),
  eventDate: z
    .string()
    .trim()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, { error: "日付を選んでください。" }),
  areaCount: z.coerce.number({ error: "数字で入力してください。" }).int().min(1).max(20),
  previousFinalBibNo: z.coerce
    .number({ error: "数字で入力してください。" })
    .int()
    .min(0)
    .max(99999),
});

/** 1.3 The finals round of the season (one per season). */
export async function createFinalsRound(
  _prev: FinalsFormState,
  formData: FormData,
): Promise<FinalsFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = FinalsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      message: "入力内容を確認してください。",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  const venue = await getAdminVenue(v.venueId);
  if (!venue)
    return { message: "会場が見つかりません。", errors: { venueId: ["会場が見つかりません。"] } };
  const season = CURRENT_SEASON_ID;
  const roundId = `tnfc${season}_finals`;
  const now = new Date().toISOString();
  try {
    await adminDb()
      .collection("tnfc_rounds")
      .doc(roundId)
      .create({
        seasonId: season,
        roundNumber: FINALS_ROUND_NUMBER,
        roundName: `THE NORTH FACE CUP ${season} 本戦`,
        venueId: venue.id,
        venueName: venue.name,
        eventDate: v.eventDate,
        entryDeadline: "",
        areaCount: v.areaCount,
        capacity: 0,
        previousFinalBibNo: v.previousFinalBibNo,
        judgePassword: "0000",
        status: "entry_closed",
        categoryQuotas: {},
        createdAt: now,
        updatedAt: now,
        updatedBy: admin.email,
      });
  } catch (err) {
    if ((err as { code?: number }).code === 6) return { message: "本戦はすでに作られています。" };
    console.error("[tnfc] finals create failed", err);
    return { message: FAILED };
  }
  await log("tnfc_finals_create", admin.email, { roundId });
  updateTag("tnfc"); // public schedule
  redirect("/admin/tnfc/finals");
}

/** 1.3 Builds the finals entries from every qualifier's finalists, with bibs and groups. */
export async function buildFinalsEntries(_prev: OpsState, formData: FormData): Promise<OpsState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const round = await getRound(String(formData.get("roundId") ?? ""));
  if (!round || !isFinalsRound(round)) return { message: "本戦が見つかりません。" };
  const { finalists } = aggregateFinalists(await getSeasonQualifierResults(round.seasonId));
  if (finalists.length === 0)
    return { message: "本戦出場者がまだいません。予選のリザルトを先に確定してください。" };

  const members = await getMembers(finalists.map((f) => f.userId));
  const existing = await getRoundEntries(round.id);
  const keep = new Set(finalists.map((f) => f.userId));
  const now = new Date().toISOString();
  const built = finalists.map((f) => {
    const m = members.get(f.userId);
    const division = m?.division ?? f.division;
    return {
      id: `${round.id}_${f.userId}`,
      userId: f.userId,
      registeredName: f.name,
      currentUserName: m?.name || f.name,
      furigana: m?.furigana ?? "",
      gender: m?.gender ?? "",
      division,
      email: m?.email ?? "",
      zeusOrderNo: `FINALS-${f.roundId}`,
      status: "confirmed",
      bibNo: null,
      sessionGroup: "",
      qualifiedRoundId: f.roundId,
    };
  });
  const { bibs, lastBibNo } = assignBibNumbers(built, round.previousFinalBibNo);
  const numbered = built.map((e) => ({ ...e, bibNo: bibs.get(e.id) ?? null }));
  const groups = planSessionGroups(numbered, round.areaCount);
  const groupOf = new Map(groups.flatMap((g) => g.entryIds.map((x) => [x, g.name] as const)));
  const dropped = existing.filter((e) => !keep.has(e.userId) && e.status !== "cancelled");

  const db = adminDb();
  try {
    const writes = [
      ...numbered.map((e) => ({ kind: "set" as const, e })),
      ...dropped.map((e) => ({ kind: "drop" as const, e })),
    ];
    for (let i = 0; i < writes.length; i += BATCH) {
      const batch = db.batch();
      for (const w of writes.slice(i, i + BATCH)) {
        const ref = db.collection("tnfc_entries").doc(w.e.id);
        if (w.kind === "drop") {
          batch.update(ref, { status: "cancelled", cancelledAt: now, updatedAt: now });
          continue;
        }
        const { id: _id, ...e } = w.e;
        batch.set(ref, {
          ...e,
          seasonId: round.seasonId,
          roundId: round.id,
          roundName: round.roundName,
          venueId: round.venueId,
          venueName: round.venueName,
          tnfcControlCategory: tnfcControlCategory(e.division),
          sessionGroup: groupOf.get(w.e.id) ?? "",
          source: "finals",
          createdAt: now,
          updatedAt: now,
        });
      }
      await batch.commit();
    }
    await db.collection("tnfc_rounds").doc(round.id).update({
      lastBibNo,
      numberedAt: now,
      updatedAt: now,
      updatedBy: admin.email,
    });
    await log("tnfc_finals_entries", admin.email, {
      roundId: round.id,
      count: numbered.length,
      dropped: dropped.length,
    });
    revalidatePath("/admin/tnfc/finals");
    revalidatePath(`/admin/tnfc/${round.id}`, "layout");
    return {
      ok: true,
      message: `本戦出場者 ${numbered.length}人のエントリーを作り、No.${round.previousFinalBibNo + 1}〜${lastBibNo} を付けました。${dropped.length > 0 ? `出場者でなくなった${dropped.length}人はキャンセルにしました。` : ""}`,
    };
  } catch (err) {
    console.error("[tnfc] finals entries failed", err);
    return { message: FAILED };
  }
}

/** 1.4 Promotes the finals' top places one Division (users, notifications, TNFC entries). */
export async function applyFinalsPromotions(
  _prev: OpsState,
  formData: FormData,
): Promise<OpsState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const round = await getRound(String(formData.get("roundId") ?? ""));
  if (!round || !isFinalsRound(round)) return { message: "本戦が見つかりません。" };
  const cutoff = Math.floor(Number(formData.get("cutoff")));
  if (!Number.isFinite(cutoff) || cutoff < 1 || cutoff > 50) {
    return { message: "昇格する順位を数字で入力してください。" };
  }
  const results = await getRoundResults(round.id);
  const members = await getMembers(results.map((r) => r.userId));
  const promotions = finalsPromotions(
    results,
    new Map([...members].map(([k, m]) => [k, m.division])),
    cutoff,
  );
  if (promotions.length === 0)
    return { message: "昇格する人はいません（すでに反映済みかもしれません）。" };

  const db = adminDb();
  const now = new Date().toISOString();
  let done = 0;
  try {
    for (const p of promotions) {
      const userRef = db.collection("users").doc(p.userId);
      await db.runTransaction(async (tx) => {
        const u = await tx.get(userRef);
        const entries = await tx.get(db.collection("tnfc_entries").where("userId", "==", p.userId));
        if (!u.exists || canonicalDivision(String(u.data()!.division ?? "")) !== p.from) return;
        tx.update(userRef, { division: p.to, divisionStatus: "confirmed", updatedAt: now });
        tx.set(db.collection("notifications").doc(`notif_${randomUUID()}`), {
          seasonId: round.seasonId,
          userId: p.userId,
          type: "division_change",
          title: "TNFC 本戦の成績による Division 昇格",
          message: `${round.roundName}（${p.from} ${p.rank}位）の成績により、Division が「${p.from}」から「${p.to}」に上がりました。`,
          oldDivision: p.from,
          newDivision: p.to,
          read: false,
          createdAt: now,
        });
        syncTnfcEntries(tx, entries.docs, {
          seasonId: round.seasonId,
          userId: p.userId,
          now,
          source: "admin",
          change: { division: p.to },
        });
        done++;
      });
    }
    await db.collection("tnfc_rounds").doc(round.id).update({
      promotionCutoff: cutoff,
      promotionsAppliedAt: now,
      updatedAt: now,
      updatedBy: admin.email,
    });
    await log("tnfc_finals_promotions", admin.email, {
      roundId: round.id,
      cutoff,
      promotions: promotions.map((p) => ({ userId: p.userId, from: p.from, to: p.to })),
    });
    await rebuildRankingCache(round.seasonId);
    updateTag("ranking");
    revalidatePath(`/admin/tnfc/${round.id}`, "layout");
    revalidatePath("/admin/tnfc/finals");
    return { ok: true, message: `${done}人の Division を1つ上げ、本人に通知しました。` };
  } catch (err) {
    console.error("[tnfc] promotions failed", err);
    return {
      message: `${done}人まで反映したところで止まりました。もう一度押すと続きを反映します。`,
    };
  }
}
