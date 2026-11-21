import "server-only";
import { aggregateRankingData } from "@/domain/ranking";
import { adminDb } from "./firebase-admin";

/**
 * Recomputes ranking_cache/{seasonId} (and "current") from Firestore.
 * The current app does this in a Cloud Functions trigger; here the server calls it
 * after a change (Tryout, approvals). Callers then run updateTag("ranking").
 */
export async function rebuildRankingCache(seasonId: string): Promise<void> {
  const db = adminDb();
  const [users, participantData, venues, competitionResults] = await Promise.all(
    ["users", "participant_data", "venues", "competition_results"].map(async (name) => {
      const snap = await db.collection(name).get();
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
