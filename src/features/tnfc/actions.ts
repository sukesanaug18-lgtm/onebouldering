"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import {
  assignBibNumbers,
  findEntryIssues,
  parseEntryCsv,
  planSessionGroups,
  tnfcControlCategory,
  VENUE_CHECKLIST,
} from "@/domain/tnfc";
import { getAdminVenue } from "@/features/venue/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getAdmin } from "@/server/admin-session";
import { adminDb } from "@/server/firebase-admin";
import { getMembers, getRound, getRoundWithMembers, ROUND_ID } from "./queries";
import { ROUND_STATUS } from "./status";

// Office work before a TNFC qualifier (workflow diagram B-4): rounds, entry CSV import,
// member sync, bib numbers and session groups. Every change is kept in admin_logs.

export type TnfcFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<string, string[]>>;
};

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";
const FAILED = "保存できませんでした。時間をおいて、もう一度お試しください。";
const BATCH = 400;

const date = z
  .string()
  .trim()
  .regex(/^(\d{4}-\d{2}-\d{2})?$/, { error: "日付を選んでください。" });
const RoundFields = {
  roundNumber: z.coerce
    .number({ error: "数字で入力してください。" })
    .int()
    .min(1, { error: "1以上で入力してください。" })
    .max(98),
  eventDate: date,
  entryDeadline: date,
  areaCount: z.coerce.number({ error: "数字で入力してください。" }).int().min(1).max(20),
  capacity: z.coerce.number({ error: "数字で入力してください。" }).int().min(0).max(2000),
  previousFinalBibNo: z.coerce
    .number({ error: "数字で入力してください。" })
    .int()
    .min(0, { error: "0以上で入力してください。" })
    .max(99999),
  judgePassword: z
    .string()
    .trim()
    .min(1, { error: "ジャッジパスワードを入力してください。" })
    .max(20),
};

const fieldErrors = (error: z.ZodError) => ({
  message: "入力内容を確認してください。",
  errors: z.flattenError(error).fieldErrors as Partial<Record<string, string[]>>,
});

const roundName = (season: string, n: number) => `THE NORTH FACE CUP ${season} ROUND${n}`;

async function log(action: string, roundId: string, by: string, detail: Record<string, unknown>) {
  await adminDb()
    .collection("admin_logs")
    .add({ action, roundId, by, at: new Date().toISOString(), ...detail });
}

const CreateSchema = z.object({
  venueId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, { error: "会場を選んでください。" }),
  ...RoundFields,
});

/** New qualifier round. The previous last bib defaults to the season's highest. */
export async function createRound(
  _prev: TnfcFormState,
  formData: FormData,
): Promise<TnfcFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data;
  const venue = await getAdminVenue(v.venueId);
  if (!venue)
    return {
      message: "入力内容を確認してください。",
      errors: { venueId: ["会場が見つかりません。"] },
    };

  const season = CURRENT_SEASON_ID;
  const id = `tnfc${season}_round${v.roundNumber}_${venue.id}`;
  const ref = adminDb().collection("tnfc_rounds").doc(id);
  const now = new Date().toISOString();
  try {
    if ((await ref.get()).exists) {
      return { message: "同じラウンド番号と会場の大会がすでにあります。" };
    }
    await ref.set({
      seasonId: season,
      roundNumber: v.roundNumber,
      roundName: roundName(season, v.roundNumber),
      venueId: venue.id,
      venueName: venue.name,
      eventDate: v.eventDate,
      entryDeadline: v.entryDeadline,
      areaCount: v.areaCount,
      capacity: v.capacity,
      previousFinalBibNo: v.previousFinalBibNo,
      judgePassword: v.judgePassword,
      status: "upcoming",
      categoryQuotas: {},
      createdAt: now,
      updatedAt: now,
      updatedBy: admin.email,
    });
    await log("tnfc_round_create", id, admin.email, {
      venueId: venue.id,
      roundNumber: v.roundNumber,
    });
  } catch (err) {
    console.error("[tnfc] create round failed", err);
    return { message: FAILED };
  }
  redirect(`/admin/tnfc/${id}`);
}

const UpdateSchema = z.object({
  id: z.string().regex(ROUND_ID),
  ...RoundFields,
  status: z.enum(Object.keys(ROUND_STATUS) as [keyof typeof ROUND_STATUS]),
  tnfcControlEventUrl: z
    .string()
    .trim()
    .max(300)
    .refine((s) => s === "" || /^https:\/\/\S+$/.test(s), {
      error: "https:// から始まる URL を入力してください。",
    }),
  ...Object.fromEntries(VENUE_CHECKLIST.map((c) => [c.key, z.string().trim().max(300)])),
});

/** Round details, status, TNFC Control link and the 8 venue items. */
export async function updateRound(
  _prev: TnfcFormState,
  formData: FormData,
): Promise<TnfcFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const v = parsed.data as z.infer<typeof UpdateSchema> & Record<string, string>;
  const ref = adminDb().collection("tnfc_rounds").doc(v.id);
  const now = new Date().toISOString();
  try {
    const before = (await ref.get()).data();
    if (!before) return { message: "大会が見つかりません。" };
    const after = {
      roundNumber: v.roundNumber,
      roundName: roundName(String(before.seasonId ?? CURRENT_SEASON_ID), v.roundNumber),
      eventDate: v.eventDate,
      entryDeadline: v.entryDeadline,
      areaCount: v.areaCount,
      capacity: v.capacity,
      previousFinalBibNo: v.previousFinalBibNo,
      judgePassword: v.judgePassword,
      status: v.status,
      tnfcControlEventUrl: v.tnfcControlEventUrl,
      checklist: Object.fromEntries(VENUE_CHECKLIST.map((c) => [c.key, v[c.key] ?? ""])),
    };
    await ref.update({ ...after, updatedAt: now, updatedBy: admin.email });
    await log("tnfc_round_update", v.id, admin.email, {
      before: Object.fromEntries(Object.keys(after).map((k) => [k, before[k] ?? null])),
      after,
    });
    revalidatePath(`/admin/tnfc/${v.id}`, "layout");
    const bibChanged =
      before.lastBibNo != null && Number(before.previousFinalBibNo ?? 0) !== v.previousFinalBibNo;
    return {
      ok: true,
      message: bibChanged
        ? "保存しました。開始ゼッケンを変えたので、ゼッケン採番をやり直してください。"
        : "保存しました。",
    };
  } catch (err) {
    console.error("[tnfc] update round failed", err);
    return { message: FAILED };
  }
}

const MAX_CSV = 2_000_000;

/**
 * Imports the entry CSV (pasted or a file). Rows are matched by license No.; existing entries
 * keep their bib number. An entry cancelled on this site is never brought back by a CSV.
 */
export async function importEntries(
  _prev: TnfcFormState,
  formData: FormData,
): Promise<TnfcFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const roundId = String(formData.get("roundId") ?? "");
  const round = await getRound(roundId);
  if (!round) return { message: "大会が見つかりません。" };

  const file = formData.get("file");
  let csv = String(formData.get("csv") ?? "");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CSV) return { message: "ファイルが大きすぎます（2MBまで）。" };
    const buf = new Uint8Array(await file.arrayBuffer());
    // The old site exports Shift_JIS; fall back to it when the file is not valid UTF-8.
    try {
      csv = new TextDecoder("utf-8", { fatal: true }).decode(buf);
    } catch {
      csv = new TextDecoder("shift_jis").decode(buf);
    }
  }
  if (!csv.trim()) return { message: "CSV ファイルを選ぶか、CSV を貼り付けてください。" };
  if (csv.length > MAX_CSV) return { message: "CSV が大きすぎます。" };

  // First pass finds the license numbers; the second fills blanks from the member data.
  const members = await getMembers(parseEntryCsv(csv, new Map()).entries.map((e) => e.userId));
  const { entries, skippedLines, unknownIds } = parseEntryCsv(csv, members);
  if (entries.length === 0) {
    return {
      message:
        "取り込める行がありませんでした。1行目に「ID」（またはライセンスNo）と「氏名」「カテゴリー」の見出しがあるか確認してください。",
    };
  }

  const db = adminDb();
  const col = db.collection("tnfc_entries");
  const now = new Date().toISOString();
  try {
    const refs = entries.map((e) => col.doc(`${round.id}_${e.userId}`));
    const existing = new Map<string, FirebaseFirestore.DocumentData>();
    for (let i = 0; i < refs.length; i += 300) {
      for (const s of await db.getAll(...refs.slice(i, i + 300)))
        if (s.exists) existing.set(s.id, s.data()!);
    }
    let added = 0;
    let kept = 0;
    for (let i = 0; i < entries.length; i += BATCH) {
      const batch = db.batch();
      entries.slice(i, i + BATCH).forEach((e, j) => {
        const ref = refs[i + j];
        const old = existing.get(ref.id);
        const keepCancelled =
          old?.status === "cancelled" && old.cancelledAt && e.status !== "cancelled";
        if (keepCancelled) kept += 1;
        if (!old) added += 1;
        batch.set(
          ref,
          {
            seasonId: round.seasonId,
            roundId: round.id,
            roundName: round.roundName,
            venueId: round.venueId,
            venueName: round.venueName,
            userId: e.userId,
            registeredName: e.registeredName,
            currentUserName: e.currentUserName,
            furigana: e.furigana,
            gender: e.gender,
            division: e.division,
            tnfcControlCategory: tnfcControlCategory(e.division),
            email: e.email,
            zeusOrderNo: e.zeusOrderNo,
            ...(keepCancelled ? {} : { status: e.status }),
            source: old?.source ?? "csv",
            importedAt: now,
            updatedAt: now,
            ...(old ? {} : { createdAt: now }),
          },
          { merge: true },
        );
      });
      await batch.commit();
    }
    await log("tnfc_entries_import", round.id, admin.email, {
      rows: entries.length,
      added,
      skippedLines,
      unknownIds,
    });
    revalidatePath(`/admin/tnfc/${round.id}`, "layout");
    const notes = [
      `${entries.length}件を取り込みました（新規 ${added}件・更新 ${entries.length - added}件）。`,
      skippedLines.length
        ? `ライセンスNo. がない ${skippedLines.join("・")} 行目は飛ばしました。`
        : "",
      unknownIds.length
        ? `会員にない番号があります：${unknownIds.slice(0, 10).join("・")}${unknownIds.length > 10 ? " ほか" : ""}。`
        : "",
      kept ? `このサイトでキャンセル済みの ${kept}件は、キャンセルのままにしました。` : "",
      round.lastBibNo != null ? "ゼッケンを採番済みなので、採番をやり直してください。" : "",
    ];
    return { ok: true, message: notes.filter(Boolean).join(" ") };
  } catch (err) {
    console.error("[tnfc] import failed", err);
    return { message: "取り込めませんでした。時間をおいて、もう一度お試しください。" };
  }
}

export type SimpleState = { ok?: boolean; message?: string };

/** Brings names and Divisions of active entries up to date with the member data (1.1.1). */
export async function syncRoundEntries(
  _prev: SimpleState,
  formData: FormData,
): Promise<SimpleState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const round = await getRound(String(formData.get("roundId") ?? ""));
  if (!round) return { message: "大会が見つかりません。" };
  const { entries, members } = await getRoundWithMembers(round.id);
  const issues = findEntryIssues(entries, members);
  const changes = new Map<string, { division?: string; name?: string }>();
  for (const { entry, now } of issues.divisionChanged) changes.set(entry.id, { division: now });
  for (const { entry, now } of issues.renamed)
    changes.set(entry.id, { ...changes.get(entry.id), name: now });
  if (changes.size === 0) return { ok: true, message: "直すところはありませんでした。" };

  const db = adminDb();
  const now = new Date().toISOString();
  const byId = new Map(entries.map((e) => [e.id, e]));
  try {
    const list = [...changes];
    for (let i = 0; i < list.length; i += BATCH / 2) {
      const batch = db.batch();
      for (const [id, c] of list.slice(i, i + BATCH / 2)) {
        const e = byId.get(id)!;
        batch.update(db.collection("tnfc_entries").doc(id), {
          ...(c.division
            ? { division: c.division, tnfcControlCategory: tnfcControlCategory(c.division) }
            : {}),
          ...(c.name ? { currentUserName: c.name } : {}),
          syncedFromMemberUpdateAt: now,
          updatedAt: now,
        });
        batch.set(db.collection("tnfc_sync_logs").doc(), {
          seasonId: round.seasonId,
          userId: e.userId,
          entryId: id,
          roundId: round.id,
          roundName: round.roundName,
          source: "admin",
          oldDivision: e.division,
          newDivision: c.division ?? e.division,
          tnfcControlCategory: tnfcControlCategory(c.division ?? e.division),
          ...(c.name ? { oldName: e.currentUserName || e.registeredName, newName: c.name } : {}),
          syncedAt: now,
          by: admin.email,
        });
      }
      await batch.commit();
    }
    await log("tnfc_entries_sync", round.id, admin.email, { count: changes.size });
    revalidatePath(`/admin/tnfc/${round.id}`, "layout");
    return {
      ok: true,
      message: `${changes.size}件を会員情報にそろえました。${round.lastBibNo != null ? "Division が変わった人がいれば、ゼッケン採番をやり直してください。" : ""}`,
    };
  } catch (err) {
    console.error("[tnfc] sync failed", err);
    return { message: FAILED };
  }
}

/** Numbers bibs and writes session groups for every active entry (1.1.1 / 1.1.3). */
export async function numberRound(_prev: SimpleState, formData: FormData): Promise<SimpleState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const round = await getRound(String(formData.get("roundId") ?? ""));
  if (!round) return { message: "大会が見つかりません。" };
  const { entries, active } = await getRoundWithMembers(round.id);
  if (active.length === 0)
    return { message: "エントリーがありません。先に CSV を取り込んでください。" };

  const { bibs, lastBibNo } = assignBibNumbers(entries, round.previousFinalBibNo);
  const numbered = entries.map((e) => ({ ...e, bibNo: bibs.get(e.id) ?? null }));
  const groups = planSessionGroups(numbered, round.areaCount);
  const groupOf = new Map(groups.flatMap((g) => g.entryIds.map((id) => [id, g.name] as const)));

  const db = adminDb();
  const now = new Date().toISOString();
  try {
    for (let i = 0; i < numbered.length; i += BATCH) {
      const batch = db.batch();
      for (const e of numbered.slice(i, i + BATCH)) {
        batch.update(db.collection("tnfc_entries").doc(e.id), {
          bibNo: e.bibNo,
          sessionGroup: groupOf.get(e.id) ?? "",
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
    await log("tnfc_round_number", round.id, admin.email, {
      first: round.previousFinalBibNo + 1,
      last: lastBibNo,
      groups: groups.length,
    });
    revalidatePath(`/admin/tnfc/${round.id}`, "layout");
    return {
      ok: true,
      message: `${active.length}人に No.${round.previousFinalBibNo + 1}〜${lastBibNo} を付け、${groups.length}グループに分けました。`,
    };
  } catch (err) {
    console.error("[tnfc] numbering failed", err);
    return { message: FAILED };
  }
}
