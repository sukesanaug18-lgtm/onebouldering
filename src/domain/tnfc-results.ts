// THE NORTH FACE CUP after the qualifier (workflow diagram B-5, 1.2.1–1.2.2).
// Ported from the current app's tnfcLogic.ts (calculateTnfcRankingPoints, buildHpUploadResultCsv,
// buildMembersSyncCsv) and TnfcOperationsManager (result import). Pure logic.

import { canonicalDivision, divisionName, UNDECIDED_DIVISION } from "./division.ts";
import { toCsv } from "./gym.ts";
import { categoryRank, parseCsv } from "./tnfc.ts";

/** Points for a place in a TNFC qualifier (official rules). 11th and below: 1,000. */
export const TNFC_RANK_POINTS: Record<number, number> = {
  1: 10000,
  2: 8000,
  3: 6000,
  4: 5000,
  5: 5000,
  6: 3000,
  7: 3000,
  8: 3000,
  9: 3000,
  10: 3000,
};

/** Multiplier by the number of players in the category: 26+ ×1.2 / 11–25 ×1.0 / 3–10 ×0.8 / 1–2 ×0.5. */
export function categorySizeMultiplier(count: number): number {
  const n = Math.max(0, Math.floor(count));
  if (n >= 26) return 1.2;
  if (n >= 11) return 1.0;
  if (n >= 3) return 0.8;
  return 0.5;
}

/** Ranking points for a place: place points × category size multiplier. No place → 0. */
export function tnfcRankingPoints(rank: number, categoryCount: number): number {
  if (!Number.isFinite(rank) || rank <= 0) return 0;
  const base = TNFC_RANK_POINTS[Math.floor(rank)] ?? 1000;
  return Math.round(base * categorySizeMultiplier(categoryCount));
}

/** Default finals line: the top 3 of each category qualify (same as the current app). */
export const DEFAULT_FINALS_CUTOFF = 3;

/** Category as written by TNFC Control or the office: "Division 3" means men's. */
export function resultCategory(raw: string): string {
  const s = String(raw ?? "").trim();
  const men = s.match(/^Division\s*(\d)$/i);
  return canonicalDivision(men ? `MD${men[1]}` : s);
}

export type ResultRow = {
  userId: string;
  name: string;
  division: string;
  rank: number;
  score: string;
};

export type ResultMember = { name: string; division: string };

export type ParsedResults = {
  rows: ResultRow[];
  /** Line numbers (1 = header) that had no license number or no valid place. */
  skippedLines: number[];
  /** License numbers that are not registered members. */
  unknownIds: string[];
  /** License numbers that appear more than once (the first line is kept). */
  duplicateIds: string[];
};

const pick = (r: Record<string, string>, keys: string[]) => {
  for (const k of keys) {
    const v = r[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

/**
 * Reads the result list exported from TNFC Control (or typed by the office).
 * Columns: 順位, ID (or ライセンスNo), 氏名, カテゴリー; スコア is optional.
 * The category falls back to the member's Division when the column is empty.
 */
export function parseResultCsv(text: string, members: Map<string, ResultMember>): ParsedResults {
  const rows: ResultRow[] = [];
  const skippedLines: number[] = [];
  const unknownIds: string[] = [];
  const duplicateIds: string[] = [];
  const seen = new Set<string>();
  parseCsv(text).forEach((r, i) => {
    const userId = pick(r, [
      "ID",
      "id",
      "ライセンスNo",
      "ライセンスNo.",
      "One Bouldering ID",
      "userId",
    ]);
    const rank = Number.parseInt(pick(r, ["順位", "rank", "Rank"]), 10);
    if (!userId || !Number.isFinite(rank) || rank <= 0) {
      skippedLines.push(i + 2);
      return;
    }
    if (seen.has(userId)) {
      duplicateIds.push(userId);
      return;
    }
    seen.add(userId);
    const member = members.get(userId);
    if (!member) unknownIds.push(userId);
    const rawCategory = pick(r, ["カテゴリー", "カテゴリ", "Division", "division", "Category"]);
    rows.push({
      userId,
      name: pick(r, ["氏名", "名前", "Name", "name"]) || member?.name || userId,
      division: rawCategory
        ? resultCategory(rawCategory)
        : canonicalDivision(member?.division ?? ""),
      rank,
      score: pick(r, ["スコア", "Score", "score"]),
    });
  });
  return { rows, skippedLines, unknownIds, duplicateIds };
}

export type ScoredResult = ResultRow & {
  categoryCount: number;
  qualified: boolean;
  points: number;
};

/**
 * Finals qualification and Ranking points. Each category uses its own player count for the
 * multiplier and its own finals line (cutoffs[category] or the default). Ties share the place.
 */
export function scoreResults(
  rows: ResultRow[],
  cutoff: number,
  cutoffs: Record<string, number> = {},
): ScoredResult[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.division, (counts.get(r.division) ?? 0) + 1);
  return rows
    .map((r) => {
      const categoryCount = counts.get(r.division) ?? 1;
      const line = cutoffs[r.division] ?? cutoff;
      return {
        ...r,
        categoryCount,
        qualified: r.division !== UNDECIDED_DIVISION && r.rank <= line,
        points: tnfcRankingPoints(r.rank, categoryCount),
      };
    })
    .sort(
      (a, b) =>
        categoryRank(a.division) - categoryRank(b.division) ||
        a.division.localeCompare(b.division) ||
        a.rank - b.rank,
    );
}

/** Categories in result order with their player and qualifier counts. */
export function categorySummary(results: ScoredResult[]) {
  const map = new Map<string, { division: string; count: number; qualified: number }>();
  for (const r of results) {
    const c = map.get(r.division) ?? { division: r.division, count: 0, qualified: 0 };
    c.count++;
    if (r.qualified) c.qualified++;
    map.set(r.division, c);
  }
  return [...map.values()];
}

/** 1.2.2 Result CSV for the results page of the old site (category, place, ID, name). */
export function hpResultCsv(
  round: { seasonId: string; venueName: string; eventDate: string },
  results: ScoredResult[],
): string {
  return toCsv(
    ["年度", "会場名", "日時", "カテゴリー", "順位", "ID", "氏名", "本戦出場権", "Ranking付与pt"],
    results.map((r) => [
      round.seasonId,
      round.venueName,
      round.eventDate,
      divisionName(r.division),
      r.rank,
      r.userId,
      r.name,
      r.qualified ? "獲得" : "",
      r.points,
    ]),
  );
}

export type SyncMember = {
  id: string;
  name: string;
  furigana: string;
  gender: string;
  division: string;
  birthDate: string;
  email: string;
};

/** 1.2.1 All members, for the 会員 sheet of the finals list on Google Drive. */
export function membersSyncCsv(members: SyncMember[]): string {
  return toCsv(
    ["ID", "氏名", "ふりがな", "性別", "Division", "生年月日", "メールアドレス"],
    members.map((m) => [
      m.id,
      m.name,
      m.furigana,
      m.gender,
      divisionName(m.division),
      m.birthDate,
      m.email,
    ]),
  );
}

/** Text for a NEWS post listing the finalists by category (pasted until the NEWS screen exists). */
export function finalistsNewsText(
  round: { roundName: string; venueName: string; eventDate: string },
  results: ScoredResult[],
): string {
  const finalists = results.filter((r) => r.qualified);
  const lines = [
    `${round.roundName}（${round.venueName}）本戦出場者のお知らせ`,
    "",
    `${round.eventDate} に開催した ${round.roundName}（${round.venueName}）の本戦出場権を獲得した ${finalists.length}名をお知らせします。`,
  ];
  for (const c of categorySummary(finalists)) {
    lines.push("", `■ ${divisionName(c.division)}`);
    for (const r of finalists.filter((x) => x.division === c.division)) {
      lines.push(`${r.rank}位　${r.name}`);
    }
  }
  lines.push(
    "",
    "本戦出場を辞退される場合は、お早めに事務局までご連絡ください。",
    "Ranking のポイント（公認大会ポイント）は、ランキングに反映済みです。",
  );
  return lines.join("\n");
}
