import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { parseRankingCache, type RankingCacheData } from "@/domain/ranking";
import { adminDb } from "@/server/firebase-admin";

export type Venue = { id: string; name: string; region: string };

/** Firestore retries for a long time when it cannot connect; give up after 5s. */
function withTimeout<T>(p: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Firestore timeout")), ms)),
  ]);
}

// The cached loaders throw on errors so a failed read is never cached;
// the exported functions catch and return an empty result instead.

async function loadRanking(seasonId: string): Promise<RankingCacheData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("ranking");
  for (const id of [seasonId, "current"]) {
    const snap = await withTimeout(adminDb().collection("ranking_cache").doc(id).get());
    const data = parseRankingCache(snap.data());
    if (data) return data;
  }
  return null;
}

async function loadVenues(): Promise<Venue[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("venues");
  const snap = await withTimeout(adminDb().collection("venues").get());
  return snap.docs
    .map((d) => {
      const v = d.data();
      return {
        id: d.id,
        name: String(v.name ?? v["会場名"] ?? d.id),
        region: String(v.region ?? v["地域"] ?? "未定"),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

/**
 * Precomputed ranking for a season (ranking_cache/{seasonId}, falls back to "current").
 * Cached for a few minutes; call revalidateTag("ranking") after approvals.
 * Returns null when there is no data yet or Firestore cannot be reached.
 */
export async function getRanking(seasonId: string): Promise<RankingCacheData | null> {
  try {
    return await loadRanking(seasonId);
  } catch (err) {
    console.error("[ranking] failed to read ranking_cache", err);
    return null;
  }
}

/** Venue names and regions for the gym / region tabs. */
export async function getVenues(): Promise<Venue[]> {
  try {
    return await loadVenues();
  } catch (err) {
    console.error("[ranking] failed to read venues", err);
    return [];
  }
}
