import "server-only";
import type { DocumentData, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { canonicalDivision } from "@/domain/division";
import { recordStatus, type ScoreStatus } from "@/domain/score";
import type { TryoutJudgment } from "@/domain/tryout";
import { adminDb } from "@/server/firebase-admin";

// Everything the my page shows for one player (workflow diagram B-2, "/mypage").
// Each record is looked up by userId and by the current app's legacy field names.

type Snap = QueryDocumentSnapshot<DocumentData>;

/** Docs in `collection` whose any of `fields` equals userId (deduplicated). */
async function byUser(collection: string, userId: string, fields: string[]): Promise<Snap[]> {
  const db = adminDb();
  const snaps = await Promise.all(
    fields.map((f) => db.collection(collection).where(f, "==", userId).get()),
  );
  const seen = new Map<string, Snap>();
  for (const s of snaps) for (const d of s.docs) seen.set(d.id, d);
  return [...seen.values()];
}

const inSeason = (d: DocumentData, seasonId: string) =>
  !d.seasonId || String(d.seasonId) === seasonId;
const text = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => Number(v ?? 0) || 0;
const newestFirst = <T extends { at: string }>(a: T, b: T) => b.at.localeCompare(a.at);

export type MyGymScore = {
  venueId: string;
  status: ScoreStatus | null;
  points: number;
  approvedPoints: number;
  rejectReason: string;
  at: string;
};

export async function getMyGymScores(userId: string, seasonId: string): Promise<MyGymScore[]> {
  const docs = await byUser("participant_data", userId, ["userId", "One_Bouldering_ID"]);
  return docs
    .map((s) => s.data())
    .filter((d) => inSeason(d, seasonId))
    .map((d) => {
      const status = recordStatus(d);
      const points = num(d.totalPoints ?? d["合計ポイント"]);
      return {
        venueId: text(d.venueId ?? d["会場_ジムID"]),
        status,
        points,
        approvedPoints: status === "Approved" ? points : num(d.approvedTotalPoints),
        rejectReason: text(d.rejectReason),
        at: text(d.submittedAt ?? d.updatedAt ?? d["タイムスタンプ"]),
      };
    })
    .filter((g) => g.venueId)
    .sort((a, b) => b.approvedPoints - a.approvedPoints || b.points - a.points);
}

export type MyTryout = {
  id: string;
  venueName: string;
  challenged: string;
  completedCount: number;
  judgment: TryoutJudgment;
  oldDivision: string;
  newDivision: string;
  at: string;
};

export async function getMyTryouts(userId: string): Promise<MyTryout[]> {
  const docs = await byUser("tryout_logs", userId, ["userId"]);
  return docs
    .map((s) => {
      const d = s.data();
      return {
        id: s.id,
        venueName: text(d.venueName ?? d.venueId),
        challenged: text(d.challengedShortDivision ?? d.challengedDivision),
        completedCount: num(d.completedCount),
        judgment: (text(d.judgment) || "KEEP") as TryoutJudgment,
        oldDivision: canonicalDivision(text(d.oldDivision)),
        newDivision: canonicalDivision(text(d.newDivision)),
        at: text(d.createdAt),
      };
    })
    .sort(newestFirst);
}

export type MyCompetition = {
  id: string;
  name: string;
  rank: string;
  points: number;
  reset: boolean;
};

export async function getMyCompetitions(userId: string, seasonId: string) {
  const docs = await byUser("competition_results", userId, ["userId", "One_Bouldering_ID"]);
  return docs
    .filter((s) => inSeason(s.data(), seasonId))
    .map((s): MyCompetition => {
      const d = s.data();
      return {
        id: s.id,
        name: text(d.competitionName ?? d["大会名"] ?? d.name) || "公認大会",
        rank: text(d.rank ?? d["順位"]),
        points: num(d.earnedPoints ?? d["獲得ポイント"] ?? d.points),
        reset: d.status === "reset_by_promotion",
      };
    });
}

export type MyTnfcEntry = {
  id: string;
  roundName: string;
  venueName: string;
  division: string;
  bibNo: string;
  sessionGroup: string;
  status: "cancelled" | "paid" | "unpaid";
  result: { rank: number; qualified: boolean; points: number } | null;
};

export async function getMyTnfc(userId: string, seasonId: string): Promise<MyTnfcEntry[]> {
  const [entries, results] = await Promise.all([
    byUser("tnfc_entries", userId, ["userId"]),
    byUser("tnfc_results", userId, ["userId"]),
  ]);
  const resultByRound = new Map(results.map((r) => [text(r.data().roundId), r.data()]));
  return entries
    .filter((s) => inSeason(s.data(), seasonId))
    .map((s) => {
      const d = s.data();
      const r = resultByRound.get(text(d.roundId));
      return {
        id: s.id,
        roundName: text(d.roundName),
        venueName: text(d.venueName),
        division: canonicalDivision(text(d.division)),
        bibNo: text(d.bibNo),
        sessionGroup: text(d.sessionGroup),
        status: d.status === "cancelled" ? "cancelled" : d.zeusOrderNo ? "paid" : "unpaid",
        result:
          r && r.status !== "cancelled_finals"
            ? {
                rank: num(r.rank),
                qualified: Boolean(r.qualifiedForFinals),
                points: num(r.rankingPointsAwarded),
              }
            : null,
      };
    });
}

export type MyNotification = { id: string; title: string; message: string; at: string };

/** Unread notifications, newest first (at most 10). */
export async function getMyNotifications(userId: string): Promise<MyNotification[]> {
  const docs = await byUser("notifications", userId, ["userId"]);
  return docs
    .filter((s) => s.data().read !== true)
    .map((s) => {
      const d = s.data();
      return { id: s.id, title: text(d.title), message: text(d.message), at: text(d.createdAt) };
    })
    .sort(newestFirst)
    .slice(0, 10);
}
