// Office analytics for one season (CLAUDE.md 4: admin/analytics). Ported from the current
// app's analytics tab: per-gym and per-Division participation, per-problem send rates and the
// hour of submission. Pure; the page reads Firestore and passes the documents in.

import { CANONICAL_DIVISIONS, canonicalDivision, UNDECIDED_DIVISION } from "./division.ts";
import { problemSendRates, type SendRate, toCsv } from "./gym.ts";
import { recordStatus } from "./score.ts";

type Doc = Record<string, unknown>;
const str = (v: unknown) => String(v ?? "").trim();

export type VenueStat = {
  id: string;
  name: string;
  region: string;
  sheets: number;
  players: number;
  pending: number;
  avgPoints: number;
};
export type DivisionStat = { division: string; registered: number; active: number; rate: number };

export type SeasonAnalytics = {
  members: number;
  activePlayers: number;
  sheets: number;
  pending: number;
  tryouts: number;
  gymsPerPlayer: number;
  newMembers: number;
  venues: VenueStat[];
  divisions: DivisionStat[];
  problems: { total: number; rates: SendRate[] };
  hours: number[];
  months: { month: string; members: number; sheets: number }[];
};

/** "2027" → April 2026 … March 2027 as YYYY-MM. */
export function seasonMonths(seasonId: string): string[] {
  const start = Number(seasonId) - 1;
  return Array.from({ length: 12 }, (_, i) => {
    const m = ((3 + i) % 12) + 1;
    return `${m >= 4 ? start : start + 1}-${String(m).padStart(2, "0")}`;
  });
}

/** Month and hour in Japan time, or null for an unreadable date. */
function jst(iso: string): { month: string; hour: number } | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const d = new Date(t + 9 * 3600_000).toISOString();
  return { month: d.slice(0, 7), hour: Number(d.slice(11, 13)) };
}

export function computeSeasonAnalytics(params: {
  seasonId: string;
  users: Doc[];
  scores: Doc[];
  tryouts: Doc[];
  venues: Doc[];
}): SeasonAnalytics {
  const { seasonId } = params;
  const inSeason = (d: Doc) => !d.seasonId || str(d.seasonId) === seasonId;
  const months = seasonMonths(seasonId);
  const monthIndex = new Map(months.map((m, i) => [m, i]));
  const monthRows = months.map((month) => ({ month, members: 0, sheets: 0 }));

  // Score sheets (one per player and gym). Rejected sheets are left out.
  const sheets = params.scores.filter((d) => inSeason(d) && recordStatus(d) !== "Rejected");
  const byVenue = new Map<
    string,
    { players: Set<string>; sheets: number; pending: number; approved: number; points: number }
  >();
  const gymsByPlayer = new Map<string, Set<string>>();
  const hours = Array.from({ length: 24 }, () => 0);
  for (const d of sheets) {
    const userId = str(d.userId ?? d.One_Bouldering_ID);
    const venueId = str(d["会場_ジムID"] ?? d.venueId);
    if (!userId || !venueId) continue;
    const v = byVenue.get(venueId) ?? {
      players: new Set(),
      sheets: 0,
      pending: 0,
      approved: 0,
      points: 0,
    };
    v.players.add(userId);
    v.sheets += 1;
    if (recordStatus(d) === "Pending") v.pending += 1;
    // Average points count approved sheets only (a Pending total is not checked by the gym yet).
    if (recordStatus(d) === "Approved") {
      v.approved += 1;
      v.points += Number(d.totalPoints ?? d["合計ポイント"]) || 0;
    }
    byVenue.set(venueId, v);
    const g = gymsByPlayer.get(userId) ?? new Set();
    g.add(venueId);
    gymsByPlayer.set(userId, g);
    const when = jst(str(d.submittedAt ?? d["提出日時"]));
    if (when) {
      hours[when.hour] += 1;
      const i = monthIndex.get(when.month);
      if (i !== undefined) monthRows[i].sheets += 1;
    }
  }

  const venueInfo = new Map(
    params.venues.map((v) => [
      str(v.id),
      { name: str(v.name ?? v["会場名"]) || str(v.id), region: str(v.region ?? v["地域"]) },
    ]),
  );
  const venues: VenueStat[] = [...byVenue]
    .map(([id, v]) => ({
      id,
      name: venueInfo.get(id)?.name ?? id,
      region: venueInfo.get(id)?.region ?? "",
      sheets: v.sheets,
      players: v.players.size,
      pending: v.pending,
      avgPoints: v.approved ? Math.round(v.points / v.approved) : 0,
    }))
    .sort(
      (a, b) => b.players - a.players || b.sheets - a.sheets || a.name.localeCompare(b.name, "ja"),
    );

  // Members by Division, and how many of them sent at least one sheet this season.
  const registered = new Map<string, number>();
  const active = new Map<string, number>();
  let newMembers = 0;
  for (const u of params.users) {
    const div = canonicalDivision(str(u.division ?? u["Division"]) || UNDECIDED_DIVISION);
    registered.set(div, (registered.get(div) ?? 0) + 1);
    if (gymsByPlayer.has(str(u.id))) active.set(div, (active.get(div) ?? 0) + 1);
    const when = jst(str(u.createdAt ?? u.registeredAt ?? u["登録日"]));
    const i = when ? monthIndex.get(when.month) : undefined;
    if (i !== undefined) {
      monthRows[i].members += 1;
      newMembers += 1;
    }
  }
  const order = [...CANONICAL_DIVISIONS, UNDECIDED_DIVISION] as string[];
  const divisions: DivisionStat[] = [...registered]
    .map(([division, n]) => ({
      division,
      registered: n,
      active: active.get(division) ?? 0,
      rate: n ? (active.get(division) ?? 0) / n : 0,
    }))
    .sort((a, b) => {
      const ia = order.indexOf(a.division);
      const ib = order.indexOf(b.division);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.division.localeCompare(b.division);
    });

  const counts = [...gymsByPlayer.values()].map((s) => s.size);
  return {
    members: params.users.length,
    activePlayers: gymsByPlayer.size,
    sheets: sheets.length,
    pending: sheets.filter((d) => recordStatus(d) === "Pending").length,
    tryouts: params.tryouts.filter(inSeason).length,
    gymsPerPlayer: counts.length ? counts.reduce((a, b) => a + b, 0) / counts.length : 0,
    newMembers,
    venues,
    divisions,
    problems: problemSendRates(sheets),
    hours,
    months: monthRows,
  };
}

/** CSV downloads for the analytics page. */
export function analyticsCsv(a: SeasonAnalytics, type: "venues" | "divisions" | "problems") {
  if (type === "venues")
    return toCsv(
      ["会場ID", "会場名", "地域", "参加人数", "提出数", "承認待ち", "平均pt"],
      a.venues.map((v) => [v.id, v.name, v.region, v.players, v.sheets, v.pending, v.avgPoints]),
    );
  if (type === "divisions")
    return toCsv(
      ["Division", "登録", "今季参加", "参加率(%)"],
      a.divisions.map((d) => [d.division, d.registered, d.active, Math.round(d.rate * 1000) / 10]),
    );
  return toCsv(
    ["課題", "完登数", "提出数", "完登率(%)"],
    a.problems.rates.map((r) => [r.no, r.sent, a.problems.total, Math.round(r.rate * 1000) / 10]),
  );
}
