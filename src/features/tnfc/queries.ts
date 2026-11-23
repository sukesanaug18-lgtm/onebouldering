import "server-only";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import {
  categoryRank,
  isActiveEntry,
  VENUE_CHECKLIST,
  type TnfcEntry,
  type TnfcMember,
  type VenueChecklistKey,
} from "@/domain/tnfc";
import { DEFAULT_FINALS_CUTOFF, type ScoredResult, type SyncMember } from "@/domain/tnfc-results";
import { isFinalsRound, type CancellationRow, type QualifierResult } from "@/domain/tnfc-finals";
import { adminDb } from "@/server/firebase-admin";
import { ROUND_STATUS, type RoundStatus } from "./status";

export { ROUND_STATUS, type RoundStatus };

// TNFC rounds and entries for the office (workflow diagram B-4). Read fresh (not cached) so
// the office always sees what it just imported or numbered.

const text = (v: unknown) => String(v ?? "").trim();
const int = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
};

export const ROUND_ID = /^[A-Za-z0-9_-]{1,100}$/;

export type AdminRound = {
  id: string;
  seasonId: string;
  roundNumber: number;
  roundName: string;
  venueId: string;
  venueName: string;
  eventDate: string;
  entryDeadline: string;
  areaCount: number;
  capacity: number;
  previousFinalBibNo: number;
  lastBibNo: number | null;
  judgePassword: string;
  tnfcControlEventUrl: string;
  status: RoundStatus;
  checklist: Record<VenueChecklistKey, string>;
  numberedAt: string;
  /** Finals line (top N of each category) and per-category overrides, set on result import. */
  finalsCutoff: number;
  finalsCutoffByCategory: Record<string, number>;
  resultsImportedAt: string;
  resultCount: number;
  finalistCount: number;
  promotionsAppliedAt: string;
  updatedAt: string;
  updatedBy: string;
};

function toRound(id: string, d: FirebaseFirestore.DocumentData): AdminRound {
  const status = text(d.status);
  const cl = (d.checklist ?? {}) as Record<string, unknown>;
  return {
    id,
    seasonId: text(d.seasonId),
    roundNumber: int(d.roundNumber),
    roundName: text(d.roundName) || id,
    venueId: text(d.venueId),
    venueName: text(d.venueName),
    eventDate: text(d.eventDate),
    entryDeadline: text(d.entryDeadline),
    areaCount: int(d.areaCount, 4) || 4,
    capacity: int(d.capacity),
    previousFinalBibNo: int(d.previousFinalBibNo),
    lastBibNo: d.lastBibNo == null ? null : int(d.lastBibNo),
    judgePassword: text(d.judgePassword) || "0000",
    tnfcControlEventUrl: text(d.tnfcControlEventUrl),
    status: status in ROUND_STATUS ? (status as RoundStatus) : "upcoming",
    checklist: Object.fromEntries(VENUE_CHECKLIST.map((c) => [c.key, text(cl[c.key])])) as Record<
      VenueChecklistKey,
      string
    >,
    numberedAt: text(d.numberedAt),
    finalsCutoff: d.finalsCutoff == null ? DEFAULT_FINALS_CUTOFF : int(d.finalsCutoff),
    finalsCutoffByCategory: Object.fromEntries(
      Object.entries((d.finalsCutoffByCategory ?? {}) as Record<string, unknown>).map(([k, v]) => [
        k,
        int(v),
      ]),
    ),
    resultsImportedAt: text(d.resultsImportedAt),
    resultCount: int(d.resultCount),
    finalistCount: int(d.finalistCount),
    promotionsAppliedAt: text(d.promotionsAppliedAt),
    updatedAt: text(d.updatedAt),
    updatedBy: text(d.updatedBy),
  };
}

export type RoundRow = AdminRound & { entries: number; cancelled: number };

/** This season's qualifier rounds by round number, with entry counts. */
export async function listRounds(seasonId: string): Promise<RoundRow[]> {
  const db = adminDb();
  const [rounds, entries] = await Promise.all([
    db.collection("tnfc_rounds").where("seasonId", "==", seasonId).get(),
    db
      .collection("tnfc_entries")
      .where("seasonId", "==", seasonId)
      .select("roundId", "status")
      .get(),
  ]);
  const counts = new Map<string, { entries: number; cancelled: number }>();
  for (const e of entries.docs) {
    const c = counts.get(text(e.get("roundId"))) ?? { entries: 0, cancelled: 0 };
    if (e.get("status") === "cancelled") c.cancelled += 1;
    else c.entries += 1;
    counts.set(text(e.get("roundId")), c);
  }
  return rounds.docs
    .map((d) => ({
      ...toRound(d.id, d.data()),
      ...(counts.get(d.id) ?? { entries: 0, cancelled: 0 }),
    }))
    .sort((a, b) => a.roundNumber - b.roundNumber || a.eventDate.localeCompare(b.eventDate));
}

export async function getRound(id: string): Promise<AdminRound | null> {
  if (!ROUND_ID.test(id)) return null;
  const snap = await adminDb().collection("tnfc_rounds").doc(id).get();
  return snap.exists ? toRound(snap.id, snap.data()!) : null;
}

export function toEntry(id: string, d: FirebaseFirestore.DocumentData): TnfcEntry {
  const bib = d.bibNo;
  return {
    id,
    userId: text(d.userId),
    registeredName: text(d.registeredName ?? d.userName),
    currentUserName: text(d.currentUserName),
    furigana: text(d.furigana),
    gender: text(d.gender),
    division: canonicalDivision(text(d.division) || UNDECIDED_DIVISION),
    email: text(d.email),
    zeusOrderNo: text(d.zeusOrderNo),
    status: text(d.status) || "confirmed",
    bibNo: bib === null || bib === undefined || bib === "" ? null : int(bib),
    sessionGroup: text(d.sessionGroup),
  };
}

export async function getRoundEntries(roundId: string): Promise<TnfcEntry[]> {
  const snap = await adminDb().collection("tnfc_entries").where("roundId", "==", roundId).get();
  return snap.docs.map((d) => toEntry(d.id, d.data()));
}

/** Current member data for the given license numbers (missing members are left out). */
export async function getMembers(ids: string[]): Promise<Map<string, TnfcMember>> {
  const unique = [...new Set(ids)].filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id));
  const out = new Map<string, TnfcMember>();
  const db = adminDb();
  for (let i = 0; i < unique.length; i += 300) {
    const refs = unique.slice(i, i + 300).map((id) => db.collection("users").doc(id));
    if (refs.length === 0) continue;
    for (const s of await db.getAll(...refs)) {
      if (!s.exists) continue;
      const u = s.data()!;
      out.set(s.id, {
        name: text(u.name ?? u["名前"]),
        furigana: text(u.furigana ?? u.kana ?? u["フリガナ"]),
        gender: text(u.gender ?? u["性別"]),
        division: canonicalDivision(text(u.division ?? u["Division"]) || UNDECIDED_DIVISION),
        email: text(u.email ?? u["メールアドレス"]),
      });
    }
  }
  return out;
}

/** Entries plus the members they belong to. */
export async function getRoundWithMembers(roundId: string) {
  const entries = await getRoundEntries(roundId);
  const members = await getMembers(entries.map((e) => e.userId));
  return { entries, members, active: entries.filter(isActiveEntry) };
}

/** The next free round number and the highest last bib so far (defaults for a new round). */
export async function nextRoundDefaults(seasonId: string) {
  const rounds = await listRounds(seasonId);
  return {
    roundNumber:
      Math.max(0, ...rounds.filter((r) => !isFinalsRound(r)).map((r) => r.roundNumber)) + 1,
    previousFinalBibNo: Math.max(0, ...rounds.map((r) => r.lastBibNo ?? 0)),
  };
}

export type RoundResult = ScoredResult & { declined: boolean };

/** Saved results of a round (diagram B-5), in category and place order. */
export async function getRoundResults(roundId: string): Promise<RoundResult[]> {
  const snap = await adminDb().collection("tnfc_results").where("roundId", "==", roundId).get();
  return snap.docs
    .map((s) => {
      const d = s.data();
      return {
        userId: text(d.userId),
        name: text(d.userName),
        division: canonicalDivision(text(d.division) || UNDECIDED_DIVISION),
        rank: int(d.rank),
        score: text(d.scoreSummary),
        categoryCount: int(d.categoryParticipants),
        qualified: Boolean(d.qualifiedForFinals),
        points: int(d.rankingPointsAwarded),
        declined: d.status === "cancelled_finals",
      };
    })
    .sort(
      (a, b) =>
        categoryRank(a.division) - categoryRank(b.division) ||
        a.division.localeCompare(b.division) ||
        a.rank - b.rank,
    );
}

/** Every member, for the 会員 sheet of the finals list (1.2.1). Office only. */
export async function getSyncMembers(): Promise<SyncMember[]> {
  const snap = await adminDb().collection("users").get();
  return snap.docs
    .map((s) => {
      const u = s.data();
      return {
        id: s.id,
        name: text(u.name ?? u["名前"]),
        furigana: text(u.furigana ?? u.kana ?? u["フリガナ"]),
        gender: text(u.gender ?? u["性別"]),
        division: canonicalDivision(text(u.division ?? u["Division"]) || UNDECIDED_DIVISION),
        birthDate: text(u.birthDate ?? u["生年月日"]),
        email: text(u.email ?? u["メールアドレス"]),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id, "ja", { numeric: true }));
}

/** Results of this season's qualifier rounds, for the finals list (diagram B-6, 1.3). */
export async function getSeasonQualifierResults(seasonId: string): Promise<QualifierResult[]> {
  const rounds = (await listRounds(seasonId)).filter((r) => !isFinalsRound(r));
  const byId = new Map(rounds.map((r) => [r.id, r]));
  if (byId.size === 0) return [];
  const snap = await adminDb().collection("tnfc_results").where("seasonId", "==", seasonId).get();
  return snap.docs
    .filter((s) => byId.has(text(s.data().roundId)))
    .map((s) => {
      const d = s.data();
      const round = byId.get(text(d.roundId))!;
      return {
        id: s.id,
        roundId: round.id,
        roundNumber: round.roundNumber,
        venueName: round.venueName,
        userId: text(d.userId),
        name: text(d.userName),
        division: canonicalDivision(text(d.division) || UNDECIDED_DIVISION),
        rank: int(d.rank),
        qualified: Boolean(d.qualifiedForFinals),
        declined: d.status === "cancelled_finals",
      };
    });
}

/** The season's finals round, or null before the office creates it. */
export const getFinalsRound = (seasonId: string) => getRound(`tnfc${seasonId}_finals`);

/** The refund / cancellation-fee ledger for the season, newest first. */
export async function getCancellations(
  seasonId: string,
): Promise<(CancellationRow & { id: string })[]> {
  const snap = await adminDb()
    .collection("tnfc_cancellations")
    .where("seasonId", "==", seasonId)
    .get();
  return snap.docs
    .map((s) => {
      const d = s.data();
      return {
        id: s.id,
        processedAt: text(d.processedAt),
        roundName: text(d.roundName),
        userId: text(d.userId),
        userName: text(d.userName),
        division: canonicalDivision(text(d.division) || UNDECIDED_DIVISION),
        zeusOrderNo: text(d.zeusOrderNo),
        cancelType: text(d.cancelType),
        amount: int(d.amount),
        contactChannel: text(d.contactChannel),
        note: text(d.note),
      };
    })
    .sort((a, b) => b.processedAt.localeCompare(a.processedAt));
}
