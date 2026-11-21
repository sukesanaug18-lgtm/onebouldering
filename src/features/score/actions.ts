"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { UNDECIDED_DIVISION } from "@/domain/division";
import {
  approvedProblems,
  mergeSubmission,
  recordStatus,
  sentProblems,
  totalPoints,
} from "@/domain/score";
import { getVenue } from "@/features/entry/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getCurrentUser } from "@/server/auth";
import { adminDb } from "@/server/firebase-admin";
import { getPointMap, scoreDocId } from "./queries";

// Ranking score submission (workflow diagram B-2). Saved as Pending; the gym approves it.
// Problems the gym already approved stay checked; the player can add more and send again.
// Field names follow the current app (participant_data, Japanese duplicates included).

export type ScoreState = { message?: string; ok?: boolean; totalPoints?: number };

const ScoreSchema = z.object({
  venue: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  problems: z.array(z.coerce.number().int().min(1).max(40)).max(40),
});

export async function submitScore(_prev: ScoreState, formData: FormData): Promise<ScoreState> {
  const user = await getCurrentUser();
  if (!user) return { message: "ログインの有効期限が切れました。もう一度ログインしてください。" };
  if (user.division === UNDECIDED_DIVISION) {
    return { message: "Divisionが未確定です。先に Division Tryout を受けてください。" };
  }

  const parsed = ScoreSchema.safeParse({
    venue: formData.get("venue"),
    problems: formData.getAll("problem"),
  });
  if (!parsed.success) return { message: "入力内容を確認してください。" };
  const venue = await getVenue(parsed.data.venue);
  if (!venue?.programs.hasRanking) {
    return { message: "このジムでは、いま Ranking を開催していません。" };
  }

  const seasonId = CURRENT_SEASON_ID;
  const points = await getPointMap(seasonId);
  const db = adminDb();
  const ref = db.collection("participant_data").doc(scoreDocId(seasonId, user.id, venue.id));

  try {
    const total = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? snap.data()! : undefined;
      const locked = approvedProblems(existing);
      const merged = mergeSubmission(parsed.data.problems, locked);
      const nos = Object.entries(merged)
        .filter(([, v]) => v === "Y")
        .map(([k]) => Number(k));

      if (nos.length === 0) throw new UserError("完登した課題を選んでください。");
      if (recordStatus(existing) === "Approved" && nos.length === sentProblems(existing).length) {
        throw new UserError("承認済みの課題のほかに、追加した課題がありません。");
      }

      const sum = totalPoints(nos, points);
      const now = new Date().toISOString();
      tx.set(
        ref,
        {
          seasonId,
          userId: user.id,
          One_Bouldering_ID: user.id,
          userName: user.name,
          venueId: venue.id,
          会場_ジムID: venue.id,
          problems: merged,
          ...merged,
          approvedProblems: Object.fromEntries(locked.map((n) => [String(n), true])),
          // Keeps the approved part in the ranking while the new submission waits for approval.
          approvedTotalPoints: totalPoints(locked, points),
          totalPoints: sum,
          合計ポイント: String(sum),
          status: "Pending",
          承認ステータス: "Pending",
          rejectReason: "",
          submittedAt: now,
          updatedAt: now,
          タイムスタンプ: now,
        },
        { merge: true },
      );
      return sum;
    });
    revalidatePath("/score");
    return { ok: true, totalPoints: total };
  } catch (err) {
    if (err instanceof UserError) return { message: err.message };
    console.error("[score] submit failed", err);
    return { message: "送信できませんでした。時間をおいて、もう一度お試しください。" };
  }
}

class UserError extends Error {}
