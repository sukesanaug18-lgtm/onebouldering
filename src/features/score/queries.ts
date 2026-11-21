import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import {
  approvedProblems,
  parsePointMaster,
  recordStatus,
  sentProblems,
  type PointMap,
  type ScoreStatus,
} from "@/domain/score";
import { adminDb } from "@/server/firebase-admin";

async function loadPointMap(seasonId: string): Promise<PointMap> {
  "use cache";
  cacheLife("hours");
  cacheTag("point_master");
  const snap = await adminDb().collection("point_master").get();
  return parsePointMaster(
    snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    seasonId,
  );
}

/** Points per problem for the season (falls back to the problem number when unreadable). */
export async function getPointMap(seasonId: string): Promise<PointMap> {
  try {
    return await loadPointMap(seasonId);
  } catch (err) {
    console.error("[score] failed to read point_master", err);
    return parsePointMaster([], seasonId);
  }
}

export function scoreDocId(seasonId: string, userId: string, venueId: string): string {
  return `${seasonId}_${userId}_${venueId}`;
}

export type MyScore = {
  status: ScoreStatus | null;
  sent: number[];
  approved: number[];
  rejectReason: string;
  totalPoints: number;
  submittedAt: string;
};

/** The player's own record at a gym this season (participant_data/{season}_{user}_{venue}). */
export async function getMyScore(
  seasonId: string,
  userId: string,
  venueId: string,
): Promise<MyScore | null> {
  const snap = await adminDb()
    .collection("participant_data")
    .doc(scoreDocId(seasonId, userId, venueId))
    .get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    status: recordStatus(d),
    sent: sentProblems(d),
    approved: approvedProblems(d),
    rejectReason: String(d.rejectReason ?? ""),
    totalPoints: Number(d.totalPoints ?? d["合計ポイント"] ?? 0) || 0,
    submittedAt: String(d.submittedAt ?? d["タイムスタンプ"] ?? ""),
  };
}
