"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { approvalFields, rejectionFields, removalFields } from "@/domain/gym";
import { recordStatus, sentProblems } from "@/domain/score";
import { getPointMap } from "@/features/score/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { adminDb } from "@/server/firebase-admin";
import {
  checkGymPassword,
  createGymSession,
  deleteGymSession,
  getGymStaff,
  type GymStaff,
} from "@/server/gym-session";
import { clearFailures, lockedMinutes, recordFailure } from "@/server/rate-limit";
import { rebuildRankingCache } from "@/server/ranking-cache";

// Gym staff actions (workflow diagram B-3). Every write checks that the record belongs to the
// signed-in venue, then rebuilds ranking_cache so the public ranking follows at once.

export type GymActionState = { message?: string; ok?: boolean; venue?: string };

const venueId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const recordId = z.string().regex(/^[A-Za-z0-9_-]{1,200}$/);
const SESSION_EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";
const FAILED = "保存できませんでした。時間をおいて、もう一度お試しください。";

class UserError extends Error {}

export async function gymLogin(_prev: GymActionState, formData: FormData) {
  const parsed = z
    .object({ venue: venueId, password: z.string().min(1).max(100) })
    .safeParse({ venue: formData.get("venue"), password: formData.get("password") });
  if (!parsed.success) return { message: "会場とパスワードを入力してください。" };
  const { venue, password } = parsed.data;

  const locked = await lockedMinutes("gym", venue);
  if (locked) {
    return { message: `入力を何度か間違えたため、${locked}分ほどロックしています。`, venue };
  }
  if (!(await checkGymPassword(venue, password))) {
    await recordFailure("gym", venue);
    return { message: "会場またはパスワードが違います。", venue };
  }
  await clearFailures("gym", venue);
  await createGymSession(venue);
  redirect("/gym-admin");
}

export async function gymLogout() {
  await deleteGymSession();
  redirect("/gym-admin/login");
}

function notification(userId: string, title: string, message: string) {
  return {
    seasonId: CURRENT_SEASON_ID,
    userId,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

function belongsTo(data: FirebaseFirestore.DocumentData, staff: GymStaff) {
  return String(data.venueId ?? data["会場_ジムID"] ?? "") === staff.venueId;
}

async function afterChange() {
  await rebuildRankingCache(CURRENT_SEASON_ID);
  updateTag("ranking");
  revalidatePath("/gym-admin", "layout");
}

/** Wraps a write: session check, user-facing errors, cache rebuild. */
async function run(work: (staff: GymStaff) => Promise<string>): Promise<GymActionState> {
  const staff = await getGymStaff();
  if (!staff) return { message: SESSION_EXPIRED };
  try {
    const message = await work(staff);
    await afterChange();
    return { ok: true, message };
  } catch (err) {
    if (err instanceof UserError) return { message: err.message };
    console.error("[gym] write failed", err);
    return { message: FAILED };
  }
}

/** Approves one record (button "only") or every checked record ("id"). */
export async function approveScores(_prev: GymActionState, formData: FormData) {
  const only = formData.get("only");
  const ids = z
    .array(recordId)
    .min(1)
    .max(200)
    .safeParse(only ? [only] : formData.getAll("id"));
  if (!ids.success) return { message: "承認する記録を選んでください。" };

  return run(async (staff) => {
    const points = await getPointMap(CURRENT_SEASON_ID);
    const db = adminDb();
    const count = await db.runTransaction(async (tx) => {
      const refs = ids.data.map((id) => db.collection("participant_data").doc(id));
      const snaps = await Promise.all(refs.map((r) => tx.get(r)));
      const now = new Date().toISOString();
      let n = 0;
      for (const s of snaps) {
        const d = s.data();
        if (!d || !belongsTo(d, staff) || recordStatus(d) !== "Pending") continue;
        tx.update(s.ref, { ...approvalFields(d, points), approvedAt: now, updatedAt: now });
        n += 1;
      }
      return n;
    });
    if (count === 0) throw new UserError("承認待ちの記録が見つかりませんでした。");
    return `${count}件を承認しました。参加賞ステッカーのお渡しをお忘れなく。`;
  });
}

const RejectSchema = z.object({
  id: recordId,
  reason: z
    .string()
    .trim()
    .min(1, { error: "差し戻しの理由を入力してください。" })
    .max(200, { error: "理由は200文字以内で入力してください。" }),
  all: z.enum(["0", "1"]).default("0"),
});

/** Sends a record back with a reason; the player gets a notification. */
export async function rejectScore(_prev: GymActionState, formData: FormData) {
  const parsed = RejectSchema.safeParse({
    id: formData.get("id"),
    reason: formData.get("reason"),
    all: formData.get("all") ?? undefined,
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }
  const { id, reason, all } = parsed.data;

  return run(async (staff) => {
    const points = await getPointMap(CURRENT_SEASON_ID);
    const db = adminDb();
    await db.runTransaction(async (tx) => {
      const ref = db.collection("participant_data").doc(id);
      const d = (await tx.get(ref)).data();
      if (!d || !belongsTo(d, staff)) throw new UserError("記録が見つかりませんでした。");
      const status = recordStatus(d);
      if (all === "1" ? status !== "Approved" : status !== "Pending") {
        throw new UserError("この記録は、すでに状態が変わっています。画面を更新してください。");
      }
      const userId = String(d.userId ?? d.One_Bouldering_ID ?? "");
      const now = new Date().toISOString();
      tx.update(ref, { ...rejectionFields(d, points, reason, all === "1"), updatedAt: now });
      tx.set(
        db.collection("notifications").doc(`notif_${randomUUID()}`),
        notification(
          userId,
          "スコアが差し戻されました",
          `${staff.venueName} の Ranking スコアが差し戻されました。理由：${reason}　内容を直して、もう一度提出してください。`,
        ),
      );
    });
    return "差し戻しました。選手にお知らせが届きます。";
  });
}

/** Removes one problem from an approved record; it stays Approved with new points. */
export async function removeProblem(_prev: GymActionState, formData: FormData) {
  const parsed = z
    .object({ id: recordId, no: z.coerce.number().int().min(1).max(40) })
    .safeParse({ id: formData.get("id"), no: formData.get("no") });
  if (!parsed.success) return { message: "入力内容を確認してください。" };
  const { id, no } = parsed.data;

  return run(async (staff) => {
    const points = await getPointMap(CURRENT_SEASON_ID);
    const db = adminDb();
    const total = await db.runTransaction(async (tx) => {
      const ref = db.collection("participant_data").doc(id);
      const d = (await tx.get(ref)).data();
      if (!d || !belongsTo(d, staff)) throw new UserError("記録が見つかりませんでした。");
      if (recordStatus(d) !== "Approved" || !sentProblems(d).includes(no)) {
        throw new UserError("この課題は、すでに取り消されています。画面を更新してください。");
      }
      const fields = removalFields(d, no, points);
      const now = new Date().toISOString();
      tx.update(ref, { ...fields, updatedAt: now });
      tx.set(
        db.collection("notifications").doc(`notif_${randomUUID()}`),
        notification(
          String(d.userId ?? d.One_Bouldering_ID ?? ""),
          "スコアが修正されました",
          `${staff.venueName} の Ranking スコアから課題No.${no} が取り消されました。現在のスコアは ${fields.totalPoints}pt です。`,
        ),
      );
      return fields.totalPoints;
    });
    return `課題No.${no} を取り消しました（${total}pt）。`;
  });
}
