// Ranking aggregation (CLAUDE.md 4: src/domain/ranking.ts). Pure logic, shared with
// Cloud Functions and scripts. Ported from the current app's aggregateRankingData so the
// stored ranking_cache format stays the same.
//
// Rules (current site, ルール・参加方法):
// - Only Approved scores count. A player's score per gym is their best result there.
// - Overall  = top 3 gym scores + official competition points (except reset_by_promotion).
// - Region   = sum of all gym scores in that region (no 3-gym cap, no competition points).
// - Gym      = the player's best score at that gym.
// - UNDECIDED players are not ranked.

import { CANONICAL_DIVISIONS, canonicalDivision, isRankedDivision } from "./division.ts";

export type RankingEntry = { id: string; name: string; score: number };
export type ShopCountEntry = { id: string; name: string; count: number; totalScore: number };

/** Stored in ranking_cache/{seasonId}.cache_data (JSON string). */
export type RankingCacheData = {
  seasonId?: string;
  updatedAt?: string;
  /** division → entries */
  global: Record<string, RankingEntry[]>;
  /** region → division → entries */
  region: Record<string, Record<string, RankingEntry[]>>;
  /** gymId → division → entries */
  gym: Record<string, Record<string, RankingEntry[]>>;
  shopCount?: {
    global: Record<string, ShopCountEntry[]>;
    region: Record<string, Record<string, ShopCountEntry[]>>;
  };
};

type Doc = Record<string, unknown>;

const str = (v: unknown) => String(v ?? "").trim();
const byScore = (a: RankingEntry, b: RankingEntry) => b.score - a.score;
const byShop = (a: ShopCountEntry, b: ShopCountEntry) =>
  b.count - a.count || b.totalScore - a.totalScore;

export function aggregateRankingData(params: {
  users: Doc[];
  participantData: Doc[];
  venues: Doc[];
  competitionResults: Doc[];
  seasonId?: string;
  now?: Date;
}): RankingCacheData {
  const { users, participantData, venues, competitionResults, seasonId } = params;

  const userMap = new Map<string, { name: string; div: string }>();
  for (const d of users) {
    const uid = str(d.userId || d.id);
    if (!uid) continue;
    userMap.set(uid, {
      name: String(d.name || d["名前"] || "不明"),
      div: canonicalDivision(String(d.division || d["Division"] || "-")),
    });
  }

  const regionOf = new Map<string, string>();
  for (const d of venues) {
    const id = str(d.id);
    if (id) regionOf.set(id, String(d.region || d["地域"] || "未定"));
  }

  type Agg = { name: string; div: string; gymScores: Map<string, number>; compPoints: number };
  const players = new Map<string, Agg>();
  const getPlayer = (uid: string): Agg => {
    let p = players.get(uid);
    if (!p) {
      const u = userMap.get(uid) ?? { name: "不明", div: "-" };
      p = { name: u.name, div: u.div, gymScores: new Map(), compPoints: 0 };
      players.set(uid, p);
    }
    return p;
  };
  const inSeason = (d: Doc) => !seasonId || !d.seasonId || String(d.seasonId) === seasonId;

  for (const d of participantData) {
    if (!inSeason(d)) continue;
    // Approved records count their total. A record sent again after approval is Pending,
    // but keeps counting the points the gym already approved (approvedTotalPoints).
    const approved = str(d["承認ステータス"] || d.status) === "Approved";
    const keptPoints = Number(d.approvedTotalPoints) || 0;
    if (!approved && keptPoints <= 0) continue;
    const uid = str(d["One_Bouldering_ID"] || d.oneBoulderingId || d.userId);
    const gymId = str(d["会場_ジムID"] || d.venueGymId || d.venueId);
    if (!uid || !gymId) continue;
    const score = approved
      ? parseInt(String(d["合計ポイント"] ?? d.totalPoints ?? 0), 10) || 0
      : keptPoints;
    const p = getPlayer(uid);
    if (score > (p.gymScores.get(gymId) ?? -1)) p.gymScores.set(gymId, score);
  }

  for (const d of competitionResults) {
    if (!inSeason(d) || d.status === "reset_by_promotion") continue;
    const uid = str(d["One_Bouldering_ID"] || d.oneBoulderingId || d.userId);
    if (!uid) continue;
    getPlayer(uid).compPoints += Number(d["獲得ポイント"] ?? d.earnedPoints ?? d.points ?? 0) || 0;
  }

  const global: Record<string, RankingEntry[]> = {};
  const region: Record<string, Record<string, RankingEntry[]>> = {};
  const gym: Record<string, Record<string, RankingEntry[]>> = {};
  const shopGlobal: Record<string, ShopCountEntry[]> = {};
  const shopRegion: Record<string, Record<string, ShopCountEntry[]>> = {};
  const regionSums = new Map<string, number>(); // `${region}\u0000${div}\u0000${uid}`

  for (const [uid, p] of players) {
    if (!isRankedDivision(p.div)) continue;
    const div = p.div;
    const scores = [...p.gymScores.values()].sort((a, b) => b - a);
    const top3 = scores.slice(0, 3).reduce((s, v) => s + v, 0);
    (global[div] ??= []).push({ id: uid, name: p.name, score: top3 + p.compPoints });

    const perRegionGyms = new Map<string, number[]>();
    for (const [gymId, score] of p.gymScores) {
      ((gym[gymId] ??= {})[div] ??= []).push({ id: uid, name: p.name, score });
      const reg = regionOf.get(gymId) ?? "未定";
      const key = `${reg}\u0000${div}\u0000${uid}`;
      regionSums.set(key, (regionSums.get(key) ?? 0) + score);
      const list = perRegionGyms.get(reg) ?? [];
      list.push(score);
      perRegionGyms.set(reg, list);
    }

    if (p.gymScores.size > 0) {
      (shopGlobal[div] ??= []).push({
        id: uid,
        name: p.name,
        count: p.gymScores.size,
        totalScore: scores.reduce((s, v) => s + v, 0),
      });
      for (const [reg, list] of perRegionGyms) {
        ((shopRegion[reg] ??= {})[div] ??= []).push({
          id: uid,
          name: p.name,
          count: list.length,
          totalScore: list.reduce((s, v) => s + v, 0),
        });
      }
    }
  }

  for (const [key, score] of regionSums) {
    const [reg, div, uid] = key.split("\u0000");
    ((region[reg] ??= {})[div] ??= []).push({ id: uid, name: players.get(uid)!.name, score });
  }

  // Sort; global keeps the canonical division order.
  const sortedGlobal: Record<string, RankingEntry[]> = {};
  const divOrder = [
    ...CANONICAL_DIVISIONS.filter((d) => global[d]),
    ...Object.keys(global).filter((d) => !(CANONICAL_DIVISIONS as readonly string[]).includes(d)),
  ];
  for (const d of divOrder) sortedGlobal[d] = global[d].sort(byScore);
  for (const divs of [...Object.values(region), ...Object.values(gym)])
    for (const list of Object.values(divs)) list.sort(byScore);
  for (const list of Object.values(shopGlobal)) list.sort(byShop);
  for (const divs of Object.values(shopRegion))
    for (const list of Object.values(divs)) list.sort(byShop);

  return {
    seasonId,
    updatedAt: (params.now ?? new Date()).toISOString(),
    global: sortedGlobal,
    region,
    gym,
    shopCount: { global: shopGlobal, region: shopRegion },
  };
}

/** Rank with ties: equal scores share the same rank (1, 2, 2, 4). */
export function withRanks(entries: RankingEntry[]): (RankingEntry & { rank: number })[] {
  let rank = 0;
  return entries.map((e, i) => {
    if (i === 0 || e.score !== entries[i - 1].score) rank = i + 1;
    return { ...e, rank };
  });
}

/**
 * Divisions with automatic promotion from the overall ranking, and the cutoff (top 10%).
 * Matches the current site: MD3, MD4, WD3.
 */
export const PROMOTION_DIVISIONS = ["Men‘s Division 3", "Men‘s Division 4", "Women‘s Division 3"];

export function promotionCutoff(division: string, playerCount: number): number {
  if (!PROMOTION_DIVISIONS.includes(canonicalDivision(division)) || playerCount === 0) return 0;
  return Math.ceil(playerCount * 0.1);
}

/** Parses a ranking_cache document. Returns null when missing or malformed. */
export function parseRankingCache(doc: Doc | undefined): RankingCacheData | null {
  if (!doc?.cache_data) return null;
  try {
    const data = typeof doc.cache_data === "string" ? JSON.parse(doc.cache_data) : doc.cache_data;
    if (data?.global && data?.region && data?.gym) return data as RankingCacheData;
  } catch {
    // fall through
  }
  return null;
}

export type MyRank = { rank: number; total: number; score: number };

/** One player's place in a ranking list (ties share a rank), or null if not listed. */
export function findMyRank(entries: RankingEntry[] | undefined, userId: string): MyRank | null {
  if (!entries?.length) return null;
  const me = withRanks(entries).find((e) => e.id === userId);
  return me ? { rank: me.rank, total: entries.length, score: me.score } : null;
}

/** The player's overall and per-region places in their Division. */
export function myRankings(
  data: RankingCacheData | null,
  userId: string,
  division: string,
): { overall: MyRank | null; regions: (MyRank & { region: string })[] } {
  if (!data) return { overall: null, regions: [] };
  const regions = Object.entries(data.region)
    .map(([region, byDiv]) => {
      const r = findMyRank(byDiv[division], userId);
      return r ? { region, ...r } : null;
    })
    .filter((r): r is MyRank & { region: string } => r !== null)
    .sort((a, b) => b.score - a.score);
  return { overall: findMyRank(data.global[division], userId), regions };
}
