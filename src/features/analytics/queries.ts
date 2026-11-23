import "server-only";
import { computeSeasonAnalytics, type SeasonAnalytics } from "@/domain/analytics";
import { adminDb } from "@/server/firebase-admin";

// Reads what the analytics page needs (no names, emails or PINs) and computes the numbers.

const docs = (snap: FirebaseFirestore.QuerySnapshot) =>
  snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Record<string, unknown>);

export async function getSeasonAnalytics(seasonId: string): Promise<SeasonAnalytics> {
  const db = adminDb();
  const [users, scores, tryouts, venues] = await Promise.all([
    db
      .collection("users")
      .select("division", "Division", "createdAt", "registeredAt", "登録日")
      .get(),
    db.collection("participant_data").get(),
    db.collection("tryout_logs").where("seasonId", "==", seasonId).select("seasonId").get(),
    db.collection("venues").select("name", "会場名", "region", "地域").get(),
  ]);
  return computeSeasonAnalytics({
    seasonId,
    users: docs(users),
    scores: docs(scores),
    tryouts: docs(tryouts),
    venues: docs(venues),
  });
}
