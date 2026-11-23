import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { parseRankingCache, type RankingCacheData } from "@/domain/ranking";
import { adminDb } from "@/server/firebase-admin";

export type Venue = { id: string; name: string; region: string; visible: boolean };

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
  // Never cache an empty list (e.g. read while the Emulator is being re-seeded).
  if (snap.empty) throw new Error("No venues found");
  return snap.docs
    .map((d) => {
      const v = d.data();
      return {
        id: d.id,
        name: String(v.name ?? v["会場名"] ?? d.id),
        region: String(v.region ?? v["地域"] ?? "未定"),
        visible: v.visible !== false,
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
  // Read at request time, never while building (the build has no data and must not bake it in).
  await connection();
  try {
    return await loadRanking(seasonId);
  } catch (err) {
    console.error("[ranking] failed to read ranking_cache", err);
    return null;
  }
}

/** Venue names and regions for the gym / region tabs. */
export async function getVenues(): Promise<Venue[]> {
  // Read at request time, never while building (the build has no data and must not bake it in).
  await connection();
  try {
    return await loadVenues();
  } catch (err) {
    console.error("[ranking] failed to read venues", err);
    return [];
  }
}

/** Venues players can pick (hidden venues left out). For name lookups use getVenues. */
export async function getPublicVenues(): Promise<Venue[]> {
  return (await getVenues()).filter((v) => v.visible);
}
