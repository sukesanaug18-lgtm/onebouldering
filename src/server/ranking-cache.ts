import "server-only";
import { aggregateRankingData } from "@/domain/ranking";
import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

// Only the fields aggregateRankingData reads (src/domain/ranking.ts), so a rebuild does not
// download whole member / score documents. Keep in sync when the aggregation changes.
const UID = ["One_Bouldering_ID", "oneBoulderingId", "userId"];
const FIELDS = {
  users: ["userId", "name", "名前", "division", "Division"],
  participant_data: [
    "seasonId",
    "承認ステータス",
    "status",
    "approvedTotalPoints",
    ...UID,
    "会場_ジムID",
    "venueGymId",
    "venueId",
    "合計ポイント",
    "totalPoints",
  ],
  venues: ["region", "地域"],
  competition_results: ["seasonId", "status", ...UID, "獲得ポイント", "earnedPoints", "points"],
} as const;

/**
 * Recomputes ranking_cache/{seasonId} (and "current") from Firestore.
 * The current app does this in a Cloud Functions trigger; here the server calls it
 * after a change (Tryout, approvals). Callers then run updateTag("ranking").
 */
export async function rebuildRankingCache(seasonId: string): Promise<void> {
  const db = adminDb();
  // Once the year-end rollover to the next season has started, players' divisions belong to
  // the next season. Rebuilding this season then would drop or move players in its final
  // ranking, so the season's cache stays as it was saved just before the rollover.
  if (await isFrozen(seasonId)) {
    console.warn(`[ranking] season ${seasonId} is frozen by the rollover; cache kept`);
    return;
  }
  const [users, participantData, venues, competitionResults] = await Promise.all(
    Object.entries(FIELDS).map(async ([name, fields]) => {
      const snap = await db
        .collection(name)
        .select(...fields.map((f) => new FieldPath(f)))
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }),
  );
  const ranking = aggregateRankingData({
    users,
    participantData,
    venues,
    competitionResults,
    seasonId,
  });
  const doc = {
    seasonId,
    cache_data: JSON.stringify(ranking),
    updatedAt: ranking.updatedAt,
    timestamp: Date.now(),
  };
  const batch = db.batch();
  batch.set(db.collection("ranking_cache").doc(seasonId), doc);
  batch.set(db.collection("ranking_cache").doc("current"), doc);
  await batch.commit();
}

/** True once the rollover from this season to the next has started (site_settings record). */
async function isFrozen(seasonId: string): Promise<boolean> {
  const next = Number(seasonId) + 1;
  if (!Number.isFinite(next)) return false;
  const snap = await adminDb().collection("site_settings").doc(`rollover_${next}`).get();
  return Boolean(snap.data()?.startedAt);
}
