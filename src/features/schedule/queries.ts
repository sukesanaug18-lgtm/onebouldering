import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { resolveVenuePrograms } from "@/domain/entry";
import { POP_REGIONS } from "@/domain/pop";
import { categoryRank } from "@/domain/tnfc";
import { adminDb } from "@/server/firebase-admin";
import { withTimeout } from "@/server/timeout";

// Public schedule (/schedule) and TNFC results (/results). Only what the public pages show:
// no entry lists, passwords or member ids.

export type PublicRound = {
  id: string;
  roundNumber: number;
  roundName: string;
  venueName: string;
  eventDate: string;
  entryDeadline: string;
  finals: boolean;
  hasResults: boolean;
  /** tnfc_rounds status (entry_open while entries are taken). */
  status: string;
};

export type ScheduleVenue = { id: string; name: string; period: string };
export type RegionGroup = { region: string; venues: ScheduleVenue[] };

export type Schedule = {
  rounds: PublicRound[];
  tryout: RegionGroup[];
  ranking: RegionGroup[];
};

const text = (v: unknown) => String(v ?? "").trim();

function toRound(id: string, d: FirebaseFirestore.DocumentData): PublicRound {
  const roundNumber = Number(d.roundNumber) || 0;
  return {
    id,
    roundNumber,
    roundName: text(d.roundName) || id,
    venueName: text(d.venueName),
    eventDate: text(d.eventDate),
    entryDeadline: text(d.entryDeadline),
    finals: roundNumber >= 90,
    hasResults: Boolean(d.resultsImportedAt),
    status: text(d.status),
  };
}

function byRegion(rows: (ScheduleVenue & { region: string })[]): RegionGroup[] {
  const regions = [
    ...POP_REGIONS,
    ...new Set(rows.map((r) => r.region).filter((r) => !POP_REGIONS.includes(r as never))),
  ];
  return regions
    .map((region) => ({
      region: region || "未定",
      venues: rows
        .filter((r) => r.region === region)
        .map(({ id, name, period }) => ({ id, name, period }))
        .sort((a, b) => a.name.localeCompare(b.name, "ja")),
    }))
    .filter((g) => g.venues.length > 0);
}

async function loadRounds(seasonId: string): Promise<PublicRound[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("tnfc");
  const snap = await withTimeout(
    adminDb()
      .collection("tnfc_rounds")
      .where("seasonId", "==", seasonId)
      .select(
        "roundNumber",
        "roundName",
        "venueName",
        "eventDate",
        "entryDeadline",
        "resultsImportedAt",
        "status",
      )
      .get(),
  );
  return snap.docs
    .map((d) => toRound(d.id, d.data()))
    .sort((a, b) => a.roundNumber - b.roundNumber || a.eventDate.localeCompare(b.eventDate));
}

async function loadVenueSchedule(): Promise<Pick<Schedule, "tryout" | "ranking">> {
  "use cache";
  cacheLife("hours");
  cacheTag("venues");
  const snap = await withTimeout(adminDb().collection("venues").get());
  const tryout: (ScheduleVenue & { region: string })[] = [];
  const ranking: (ScheduleVenue & { region: string })[] = [];
  for (const d of snap.docs) {
    const v = d.data();
    if (v.visible === false) continue;
    const p = resolveVenuePrograms(v);
    const base = {
      id: d.id,
      name: text(v.name ?? v["会場名"]) || d.id,
      region: text(v.region ?? v["地域"]) || "未定",
    };
    if (p.hasTryout) tryout.push({ ...base, period: p.tryoutPeriod });
    if (p.hasRanking) ranking.push({ ...base, period: p.rankingPeriod });
  }
  return { tryout: byRegion(tryout), ranking: byRegion(ranking) };
}

/** Everything the schedule page shows; empty lists when Firestore cannot be read. */
export async function getSchedule(seasonId: string): Promise<Schedule> {
  await connection();
  const [rounds, venues] = await Promise.all([
    loadRounds(seasonId).catch((err) => {
      console.error("[schedule] failed to read tnfc_rounds", err);
      return [];
    }),
    loadVenueSchedule().catch((err) => {
      console.error("[schedule] failed to read venues", err);
      return { tryout: [], ranking: [] };
    }),
  ]);
  return { rounds, ...venues };
}

export async function getRoundsWithResults(seasonId: string): Promise<PublicRound[]> {
  return (await getSchedule(seasonId)).rounds.filter((r) => r.hasResults);
}

export type PublicResultRow = { rank: number; name: string; qualified: boolean };
export type PublicResultGroup = { division: string; rows: PublicResultRow[] };

async function loadResults(roundId: string): Promise<PublicResultGroup[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("tnfc");
  const snap = await withTimeout(
    adminDb()
      .collection("tnfc_results")
      .where("roundId", "==", roundId)
      .select("userName", "division", "rank", "qualifiedForFinals", "status")
      .get(),
  );
  const groups = new Map<string, PublicResultRow[]>();
  for (const s of snap.docs) {
    const d = s.data();
    const division = canonicalDivision(text(d.division) || UNDECIDED_DIVISION);
    const list = groups.get(division) ?? [];
    list.push({
      rank: Number(d.rank) || 0,
      name: text(d.userName),
      qualified: Boolean(d.qualifiedForFinals) && d.status !== "cancelled_finals",
    });
    groups.set(division, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => categoryRank(a) - categoryRank(b) || a.localeCompare(b))
    .map(([division, rows]) => ({ division, rows: rows.sort((a, b) => a.rank - b.rank) }));
}

/** A round and its results by category, or null for an unknown / not yet published round. */
export async function getPublicResults(
  seasonId: string,
  roundId: string,
): Promise<{ round: PublicRound; groups: PublicResultGroup[] } | null> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(roundId)) return null;
  const round = (await getSchedule(seasonId)).rounds.find((r) => r.id === roundId);
  if (!round?.hasResults) return null;
  try {
    return { round, groups: await loadResults(roundId) };
  } catch (err) {
    console.error("[results] failed to read tnfc_results", err);
    return { round, groups: [] };
  }
}
