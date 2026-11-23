import "server-only";
import type { DocumentData } from "firebase-admin/firestore";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { newProblems } from "@/domain/gym";
import { approvedProblems, recordStatus, sentProblems, type ScoreStatus } from "@/domain/score";
import type { TryoutJudgment } from "@/domain/tryout";
import { adminDb } from "@/server/firebase-admin";

// Data for the gym staff screens. Always scoped to the signed-in venue; records are found by
// the new field (venueId) and the current app's field (会場_ジムID).

const text = (v: unknown) => String(v ?? "").trim();
const num = (v: unknown) => Number(v ?? 0) || 0;

async function byVenue(collection: string, venueId: string, fields: string[]) {
  const db = adminDb();
  const snaps = await Promise.all(
    fields.map((f) => db.collection(collection).where(f, "==", venueId).get()),
  );
  const seen = new Map<string, { id: string; data: DocumentData }>();
  for (const s of snaps) for (const d of s.docs) seen.set(d.id, { id: d.id, data: d.data() });
  return [...seen.values()];
}

export type GymRecord = {
  id: string;
  userId: string;
  name: string;
  division: string;
  status: ScoreStatus | null;
  sent: number[];
  approved: number[];
  added: number[];
  points: number;
  approvedPoints: number;
  rejectReason: string;
  at: string;
  raw: DocumentData;
};

/** This season's Ranking records at the venue, with player names and Divisions. */
export async function getVenueRecords(venueId: string, seasonId: string): Promise<GymRecord[]> {
  const docs = (await byVenue("participant_data", venueId, ["venueId", "会場_ジムID"])).filter(
    ({ data }) => !data.seasonId || text(data.seasonId) === seasonId,
  );
  const userIds = [
    ...new Set(docs.map(({ data }) => text(data.userId ?? data.One_Bouldering_ID))),
  ].filter(Boolean);
  const db = adminDb();
  const users = userIds.length
    ? await db.getAll(...userIds.map((id) => db.collection("users").doc(id)))
    : [];
  const userById = new Map(users.filter((u) => u.exists).map((u) => [u.id, u.data()!]));

  return docs.map(({ id, data }) => {
    const userId = text(data.userId ?? data.One_Bouldering_ID);
    const u = userById.get(userId);
    const status = recordStatus(data);
    const points = num(data.totalPoints ?? data["合計ポイント"]);
    return {
      id,
      userId,
      name: text(u?.name ?? u?.["名前"] ?? data.userName) || "（不明）",
      division: canonicalDivision(text(u?.division ?? u?.["Division"]) || UNDECIDED_DIVISION),
      status,
      sent: sentProblems(data),
      approved: approvedProblems(data),
      added: status === "Pending" ? newProblems(data) : [],
      points,
      approvedPoints: status === "Approved" ? points : num(data.approvedTotalPoints),
      rejectReason: text(data.rejectReason),
      at: text(data.submittedAt ?? data.updatedAt ?? data["タイムスタンプ"]),
      raw: data,
    };
  });
}

/** Records whose name or license number contains `q` (case-insensitive). */
export function filterRecords<T extends { name: string; userId: string }>(list: T[], q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return list;
  return list.filter((r) => r.name.toLowerCase().includes(s) || r.userId.includes(s));
}

export type GymTryout = {
  id: string;
  at: string;
  userId: string;
  name: string;
  category: string;
  precheck: string;
  challenged: string;
  completed: number[];
  completedCount: number;
  judgment: TryoutJudgment;
  oldDivision: string;
  newDivision: string;
};

/** Every Tryout taken at the venue this season, newest first. */
export async function getVenueTryouts(venueId: string, seasonId: string): Promise<GymTryout[]> {
  const docs = await byVenue("tryout_logs", venueId, ["venueId"]);
  return docs
    .filter(({ data }) => !data.seasonId || text(data.seasonId) === seasonId)
    .map(({ id, data }) => ({
      id,
      at: text(data.createdAt),
      userId: text(data.userId),
      name: text(data.userName),
      category: text(data.category),
      precheck: text(data.preCheckResult),
      challenged: text(data.challengedShortDivision ?? data.challengedDivision),
      completed: Array.isArray(data.completedProblemNos)
        ? data.completedProblemNos.map(Number)
        : [],
      completedCount: num(data.completedCount ?? data.completedProblemNos?.length),
      judgment: (text(data.judgment) || "KEEP") as TryoutJudgment,
      oldDivision: canonicalDivision(text(data.oldDivision)),
      newDivision: canonicalDivision(text(data.newDivision)),
    }))
    .sort((a, b) => b.at.localeCompare(a.at));
}
