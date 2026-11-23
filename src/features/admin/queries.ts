import "server-only";
import { UNDECIDED_DIVISION } from "@/domain/division";
import { getVenues } from "@/features/ranking/queries";
import { adminDb } from "@/server/firebase-admin";

// Numbers for the office dashboard. Count queries keep the cost at one read per 1,000 docs.

export type Dashboard = {
  members: number;
  undecided: number;
  pending: number;
  tryouts: number;
  tnfcEntries: number;
  pendingByVenue: { venueId: string; name: string; count: number }[];
};

export async function getDashboard(seasonId: string): Promise<Dashboard> {
  const db = adminDb();
  const count = async (q: FirebaseFirestore.Query) => (await q.count().get()).data().count;
  const [members, undecided, tryouts, tnfcAll, tnfcCancelled, pendingNew, pendingLegacy, venues] =
    await Promise.all([
      count(db.collection("users")),
      count(db.collection("users").where("division", "==", UNDECIDED_DIVISION)),
      count(db.collection("tryout_logs").where("seasonId", "==", seasonId)),
      count(db.collection("tnfc_entries").where("seasonId", "==", seasonId)),
      count(
        db
          .collection("tnfc_entries")
          .where("seasonId", "==", seasonId)
          .where("status", "==", "cancelled"),
      ),
      db
        .collection("participant_data")
        .where("status", "==", "Pending")
        .select("venueId", "会場_ジムID", "seasonId")
        .get(),
      db
        .collection("participant_data")
        .where("承認ステータス", "==", "Pending")
        .select("venueId", "会場_ジムID", "seasonId")
        .get(),
      getVenues(),
    ]);

  const pendingDocs = new Map<string, FirebaseFirestore.DocumentData>();
  for (const d of [...pendingNew.docs, ...pendingLegacy.docs]) pendingDocs.set(d.id, d.data());
  const byVenue = new Map<string, number>();
  for (const d of pendingDocs.values()) {
    if (d.seasonId && String(d.seasonId) !== seasonId) continue;
    const v = String(d.venueId ?? d["会場_ジムID"] ?? "");
    if (v) byVenue.set(v, (byVenue.get(v) ?? 0) + 1);
  }
  const name = new Map(venues.map((v) => [v.id, v.name]));

  return {
    members,
    undecided,
    pending: [...byVenue.values()].reduce((a, b) => a + b, 0),
    tryouts,
    tnfcEntries: tnfcAll - tnfcCancelled,
    pendingByVenue: [...byVenue]
      .map(([venueId, c]) => ({ venueId, name: name.get(venueId) ?? venueId, count: c }))
      .sort((a, b) => b.count - a.count),
  };
}
