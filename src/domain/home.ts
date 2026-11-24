// Top page data (CLAUDE.md 5-4, 5-5): "now running / coming soon" and the national top 3.
// Pure functions; the queries feed them Firestore data and today's date in Japan.

import { CANONICAL_DIVISIONS, divisionName } from "./division.ts";
import type { RankingCacheData } from "./ranking.ts";

export type EventKind = "tnfc" | "tryout" | "ranking";

export type UpcomingItem = {
  id: string;
  event: EventKind;
  title: string;
  date: string;
  place: string;
  status: "live" | "open" | "soon";
  href: string;
};

export type UpcomingRound = {
  id: string;
  roundNumber: number;
  venueName: string;
  eventDate: string;
  /** entry_open while entries are taken. */
  status: string;
  finals: boolean;
};

export type UpcomingVenue = {
  id: string;
  name: string;
  region: string;
  /** Free text such as "2026/4/1〜2027/3/31" or "2026-9-3(木) ～ 2026-9-29(火)". */
  period: string;
};

const DATE = /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/g;
const iso = (y: string, m: string, d: string) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;

/**
 * The first and last date in a period text (YYYY-MM-DD), or null when there is none.
 * An end written without a year ("2027/1/27~2/28") takes the start's year (or the next one).
 */
export function parsePeriod(text: string): { start: string; end: string } | null {
  const matches = [...text.matchAll(DATE)];
  if (matches.length === 0) return null;
  const start = iso(matches[0][1], matches[0][2], matches[0][3]);
  if (matches.length > 1) {
    const m = matches[matches.length - 1];
    return { start, end: iso(m[1], m[2], m[3]) };
  }
  const rest = text.slice(matches[0].index + matches[0][0].length);
  const short = rest.match(/(?:^|[^\d])(\d{1,2})[/.-](\d{1,2})(?!\d)/);
  if (!short) return { start, end: start };
  let end = iso(matches[0][1], short[1], short[2]);
  if (end < start) end = iso(String(Number(matches[0][1]) + 1), short[1], short[2]);
  return { start, end };
}

/** YYYY-MM-DD plus n days. */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
/** "2026-09-26" → "2026.9.26（土）". */
export function dateLabel(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return date;
  const w = WEEK[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${m[1]}.${+m[2]}.${+m[3]}（${w}）`;
}

const EVENT_NAME = { tryout: "Division Tryout", ranking: "ONE bouldering Ranking" } as const;
const REGION_ORDER = ["北海道", "東北", "関東", "東海", "関西", "九州"];
const STATUS_ORDER = { live: 0, open: 1, soon: 2 } as const;

/**
 * Up to `limit` items: TNFC rounds in the next 60 days, one line per program running now
 * ("12ジムで開催中"), and gyms starting within 30 days. Running first, then by date.
 */
export function buildUpcoming(
  input: { rounds: UpcomingRound[]; tryout: UpcomingVenue[]; ranking: UpcomingVenue[] },
  today: string,
  limit = 6,
): UpcomingItem[] {
  const items: (UpcomingItem & { sort: string })[] = [];

  for (const r of input.rounds) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.eventDate)) continue;
    if (r.eventDate < today || r.eventDate > addDays(today, 60)) continue;
    const status = r.eventDate === today ? "live" : r.status === "entry_open" ? "open" : "soon";
    items.push({
      id: `tnfc-${r.id}`,
      event: "tnfc",
      title: r.finals ? "THE NORTH FACE CUP 本戦" : `THE NORTH FACE CUP ROUND ${r.roundNumber}`,
      date: dateLabel(r.eventDate),
      place: r.venueName,
      status,
      href: "/tnfc",
      sort: r.eventDate,
    });
  }

  for (const event of ["tryout", "ranking"] as const) {
    const running: UpcomingVenue[] = [];
    for (const v of input[event]) {
      const p = parsePeriod(v.period);
      if (!p || p.end < today) continue;
      if (p.start <= today) {
        running.push(v);
      } else if (p.start <= addDays(today, 30)) {
        items.push({
          id: `${event}-${v.id}`,
          event,
          title: `${EVENT_NAME[event]}｜${v.name}`,
          date: v.period,
          place: v.region,
          status: "soon",
          href: "/schedule",
          sort: p.start,
        });
      }
    }
    if (running.length > 0) {
      const regions = REGION_ORDER.filter((r) => running.some((v) => v.region === r));
      items.push({
        id: `${event}-running`,
        event,
        title: EVENT_NAME[event],
        date: `${running.length}ジムで開催中`,
        place: regions.length ? regions.join("・") : "全国の参加ジム",
        status: "live",
        href: "/schedule",
        sort: today,
      });
    }
  }

  return items
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.sort.localeCompare(b.sort))
    .slice(0, limit)
    .map(({ sort: _sort, ...item }) => item);
}

export type TopRow = { rank: number; name: string; gym: string; points: number };
export type TopGroup = { label: string; rows: TopRow[] };

/**
 * National top 3 of the highest Men's and Women's divisions that have players, with the gym
 * where each player scored best. Tied scores share a place.
 */
export function buildRankingTop(
  data: RankingCacheData | null,
  venueName: (id: string) => string,
): TopGroup[] {
  if (!data) return [];
  const groups: TopGroup[] = [];
  for (const prefix of ["Men‘s", "Women‘s"]) {
    const div = CANONICAL_DIVISIONS.find(
      (d) => d.startsWith(prefix) && (data.global[d]?.length ?? 0) > 0,
    );
    if (!div) continue;
    const entries = [...data.global[div]].sort((a, b) => b.score - a.score);
    const rows: TopRow[] = [];
    entries.forEach((e, i) => {
      const rank = i > 0 && e.score === entries[i - 1].score ? rows[i - 1].rank : i + 1;
      if (rank > 3) return;
      let best = { gym: "", score: -1 };
      for (const [gymId, byDiv] of Object.entries(data.gym ?? {})) {
        const mine = byDiv[div]?.find((x) => x.id === e.id);
        if (mine && mine.score > best.score) best = { gym: venueName(gymId), score: mine.score };
      }
      rows.push({ rank, name: e.name, gym: best.gym, points: e.score });
    });
    groups.push({ label: divisionName(div), rows });
  }
  return groups;
}
