import "server-only";
import { canonicalDivision, UNDECIDED_DIVISION } from "@/domain/division";
import {
  isActiveEntry,
  VENUE_CHECKLIST,
  type TnfcEntry,
  type TnfcMember,
  type VenueChecklistKey,
} from "@/domain/tnfc";
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
    roundNumber: Math.max(0, ...rounds.map((r) => r.roundNumber)) + 1,
    previousFinalBibNo: Math.max(0, ...rounds.map((r) => r.lastBibNo ?? 0)),
  };
}
