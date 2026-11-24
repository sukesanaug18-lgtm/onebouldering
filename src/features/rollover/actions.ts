"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { computeRollover, rolloverMessage } from "@/domain/rollover";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";
import { getAdmin } from "@/server/admin-session";
import { adminDb } from "@/server/firebase-admin";
import { rebuildRankingCache } from "@/server/ranking-cache";
import { getRolloverMembers, getRolloverRecord, rolloverDocId } from "./queries";

// Year-end reset and U category moves (workflow diagram B-7, 1.5.1–1.5.2). Runs once per
// season: the record in site_settings blocks a second run, because by then some players may
// already have taken a new Tryout. A run that stops half way can be continued (the changes
// are recomputed and players already moved are no longer listed).

export type RolloverState = { ok?: boolean; message?: string };

const BATCH = 200; // 2 writes per player (user + notification)

export async function applyRollover(
  _prev: RolloverState,
  formData: FormData,
): Promise<RolloverState> {
  const admin = await getAdmin();
  if (!admin) return { message: "ログインの有効期限が切れました。もう一度ログインしてください。" };
  const nextSeasonId = String(Number(CURRENT_SEASON_ID) + 1);
  if (String(formData.get("nextSeasonId") ?? "") !== nextSeasonId) {
    return { message: "画面が古くなっています。再読み込みしてからやり直してください。" };
  }
  const db = adminDb();
  const recordRef = db.collection("site_settings").doc(rolloverDocId(nextSeasonId));
  const record = await getRolloverRecord(nextSeasonId);
  if (record?.completedAt) {
    return { message: `${seasonLabel(nextSeasonId)} シーズンへの年度更新はもう済んでいます。` };
  }

  const { changes } = computeRollover(await getRolloverMembers(), nextSeasonId);
  const now = new Date().toISOString();
  const label = seasonLabel(nextSeasonId);
  let done = 0;
  try {
    // Save this season's final ranking with the divisions players competed in, before any
    // division changes. From here on the season's ranking_cache is frozen (ranking-cache.ts).
    if (!record?.startedAt) await rebuildRankingCache(CURRENT_SEASON_ID);
    await recordRef.set(
      { nextSeasonId, startedAt: record?.startedAt || now, by: admin.email },
      { merge: true },
    );
    for (let i = 0; i < changes.length; i += BATCH) {
      const batch = db.batch();
      for (const c of changes.slice(i, i + BATCH)) {
        const undecided = c.to === UNDECIDED_DIVISION;
        batch.update(db.collection("users").doc(c.userId), {
          division: c.to,
          divisionStatus: undecided ? "undecided" : "confirmed",
          updatedAt: now,
          updatedBy: admin.email,
        });
        batch.set(db.collection("notifications").doc(`notif_${randomUUID()}`), {
          seasonId: nextSeasonId,
          userId: c.userId,
          type: "division_change",
          title: "年度更新によるカテゴリーの変更",
          message: rolloverMessage(c, label),
          oldDivision: canonicalDivision(c.from),
          newDivision: c.to,
          read: false,
          createdAt: now,
        });
      }
      await batch.commit();
      done += Math.min(BATCH, changes.length - i);
    }
    await recordRef.set(
      { completedAt: now, changed: (record?.changed ?? 0) + done },
      { merge: true },
    );
    await db.collection("admin_logs").add({
      action: "season_rollover",
      by: admin.email,
      at: now,
      nextSeasonId,
      count: done,
      changes: changes.map((c) => ({ userId: c.userId, from: c.from, to: c.to, reason: c.reason })),
    });
    updateTag("ranking");
    updateTag("members");
    revalidatePath("/admin/rollover");
    return { ok: true, message: `${done}人のカテゴリーを更新し、本人に通知しました。` };
  } catch (err) {
    console.error("[rollover] failed", err);
    if (done > 0) await recordRef.set({ changed: (record?.changed ?? 0) + done }, { merge: true });
    return {
      message: `${done}人まで反映したところで止まりました。もう一度押すと続きを反映します。`,
    };
  }
}
