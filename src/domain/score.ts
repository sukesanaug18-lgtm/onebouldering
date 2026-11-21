// Ranking score sheet: 40 problems per gym (workflow diagram B-2, "Ranking 40課題提出フロー").
// Ported from the current app's integratedLogic.ts / functions (submitRankingScore).

export const PROBLEM_COUNT = 40;
export const PROBLEM_NOS = Array.from({ length: PROBLEM_COUNT }, (_, i) => i + 1);

export type ScoreStatus = "Pending" | "Approved" | "Rejected";
export type PointMap = Record<number, number>;

type Doc = Record<string, unknown>;

/** True for the "sent" spellings found in stored data: true, "Y", "完登", "true". */
export function isSent(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v !== "string") return false;
  const s = v.trim();
  return s.toUpperCase() === "Y" || s === "完登" || s.toLowerCase() === "true";
}

/** Points per problem from point_master docs. Problems without a row are worth their number. */
export function parsePointMaster(docs: Doc[], seasonId: string): PointMap {
  const map: PointMap = Object.fromEntries(PROBLEM_NOS.map((n) => [n, n]));
  for (const d of docs) {
    const season = d.seasonId ? String(d.seasonId) : "";
    if (season && season !== seasonId) continue;
    const no = Number(d.no ?? String(d.id ?? "").replace(/\D/g, ""));
    if (no >= 1 && no <= PROBLEM_COUNT) map[no] = Number(d.points) || 0;
  }
  return map;
}

/** Problem numbers marked sent in a stored record (problems map, or legacy top-level "1"… / "課題_1"…). */
export function sentProblems(record: Doc | undefined): number[] {
  if (!record) return [];
  const problems = (record.problems ?? {}) as Doc;
  return PROBLEM_NOS.filter((n) =>
    isSent(problems[String(n)] ?? record[String(n)] ?? record[`課題_${n}`]),
  );
}

export function totalPoints(nos: number[], points: PointMap): number {
  return nos.reduce((sum, n) => sum + (points[n] ?? 0), 0);
}

/**
 * Problems the gym already approved; they stay checked and cannot be removed by the player.
 * Records approved before approvedProblems existed count every sent problem as approved.
 */
export function approvedProblems(record: Doc | undefined): number[] {
  if (!record) return [];
  const approved = record.approvedProblems as Doc | undefined;
  if (approved && Object.keys(approved).length) {
    return PROBLEM_NOS.filter((n) => approved[String(n)] === true);
  }
  return recordStatus(record) === "Approved" ? sentProblems(record) : [];
}

export function recordStatus(record: Doc | undefined): ScoreStatus | null {
  const s = String(record?.["承認ステータス"] ?? record?.status ?? "");
  return s === "Pending" || s === "Approved" || s === "Rejected" ? s : null;
}

/** Submitted problems plus the locked (approved) ones, as the stored "Y"/"N" map. */
export function mergeSubmission(submitted: number[], locked: number[]): Record<string, "Y" | "N"> {
  const on = new Set([...submitted, ...locked]);
  return Object.fromEntries(PROBLEM_NOS.map((n) => [String(n), on.has(n) ? "Y" : "N"]));
}

/** "?prefill=7,8,9" from the Tryout result → valid problem numbers. */
export function parsePrefill(raw: string | undefined): number[] {
  if (!raw) return [];
  const nos = raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= PROBLEM_COUNT);
  return [...new Set(nos)].sort((a, b) => a - b);
}
