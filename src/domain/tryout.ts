// Division Tryout rules (CLAUDE.md 4: src/domain; workflow diagram B-2).
// Ported from the current app's integratedLogic.ts (evaluateTryoutResult and friends).

import { canonicalDivision, shortDivision, UNDECIDED_DIVISION } from "./division.ts";

export type TryoutCategory = "MD" | "WD";
export type ChallengeDivision = "MD2" | "MD3" | "MD4" | "MD5" | "WD2" | "WD3" | "WD4";
export type TryoutJudgment = "PROMOTION" | "KEEP" | "DEMOTION" | "INITIAL";

/** Problems per challenge. A Tryout always has 6 designated problems. */
export const TRYOUT_PROBLEM_COUNT = 6;

export const CHALLENGEABLE: Record<TryoutCategory, ChallengeDivision[]> = {
  MD: ["MD5", "MD4", "MD3", "MD2"],
  WD: ["WD4", "WD3", "WD2"],
};

/** First designated problem number; the six problems are first … first+5. */
const FIRST_PROBLEM: Record<ChallengeDivision, number> = {
  MD5: 3,
  MD4: 5,
  MD3: 7,
  MD2: 9,
  WD4: 1,
  WD3: 3,
  WD2: 5,
};

export function tryoutProblems(div: ChallengeDivision): number[] {
  const first = FIRST_PROBLEM[div];
  return Array.from({ length: TRYOUT_PROBLEM_COUNT }, (_, i) => first + i);
}

export function tryoutProblemsLabel(div: ChallengeDivision): string {
  const nos = tryoutProblems(div);
  return `No.${nos[0]}〜${nos[nos.length - 1]}`;
}

/** Pre-Check answers: number of sends (0–5 for MD, 0–4 for WD) or "Skip". */
export const PRECHECK_MAX: Record<TryoutCategory, number> = { MD: 5, WD: 4 };

/**
 * Recommended challenge Division from the Pre-Check send count.
 * MD: 0–2 → MD5, 3 → MD4, 4 → MD3, 5 → MD2. WD: 0–1 → WD4, 2 → WD3, 3–4 → WD2.
 */
export function recommendedChallenge(category: TryoutCategory, sends: number): ChallengeDivision {
  const n = Math.max(0, Math.floor(sends));
  if (category === "MD") {
    if (n >= 5) return "MD2";
    if (n === 4) return "MD3";
    if (n === 3) return "MD4";
    return "MD5";
  }
  if (n >= 3) return "WD2";
  if (n === 2) return "WD3";
  return "WD4";
}

export function isChallengeDivision(v: string, category?: TryoutCategory): v is ChallengeDivision {
  const list = category ? CHALLENGEABLE[category] : [...CHALLENGEABLE.MD, ...CHALLENGEABLE.WD];
  return (list as string[]).includes(v);
}

/** Tryout category for a registered gender, or null when the player may pick ("その他"). */
export function categoryForGender(gender: string): TryoutCategory | null {
  if (gender === "男性") return "MD";
  if (gender === "女性") return "WD";
  return null;
}

/** True for U-8 … U-15 categories, which are decided by age, not by Tryout. */
export function isUCategory(division: string): boolean {
  return canonicalDivision(division).startsWith("U-");
}

export type TryoutResult = {
  challenged: ChallengeDivision;
  completedCount: number;
  judgment: TryoutJudgment;
  /** Canonical name of the new Division, e.g. "Men‘s Division 2". */
  newDivision: string;
  oldDivision: string;
  /** Competition points are reset only when an already-confirmed player is promoted. */
  resetCompetitionPoints: boolean;
};

/**
 * Judges a Tryout. 6 sends: up one Division (MD2/WD2 → Division 1). 4–5: stay.
 * 0–3: down one Division, except at the lowest (MD5 / WD4).
 * A first-time player (UNDECIDED) who stays gets INITIAL.
 */
export function evaluateTryout(input: {
  challenged: ChallengeDivision;
  completedCount: number;
  currentDivision: string;
}): TryoutResult {
  const { challenged } = input;
  const category = challenged.slice(0, 2) as TryoutCategory;
  const level = Number(challenged.slice(2));
  const lowest = category === "MD" ? 5 : 4;
  const count = Math.max(0, Math.min(TRYOUT_PROBLEM_COUNT, Math.floor(input.completedCount)));

  let judgment: TryoutJudgment;
  let newLevel = level;
  if (count === TRYOUT_PROBLEM_COUNT) {
    judgment = "PROMOTION";
    newLevel = Math.max(1, level - 1);
  } else if (count >= 4 || level >= lowest) {
    judgment = "KEEP";
  } else {
    judgment = "DEMOTION";
    newLevel = level + 1;
  }

  const oldDivision = canonicalDivision(input.currentDivision || UNDECIDED_DIVISION);
  const isInitial = !oldDivision || oldDivision === UNDECIDED_DIVISION;
  const newDivision = canonicalDivision(`${category}${newLevel}`);
  if (isInitial && judgment === "KEEP") judgment = "INITIAL";

  return {
    challenged,
    completedCount: count,
    judgment,
    newDivision,
    oldDivision,
    resetCompetitionPoints: !isInitial && isHigherDivision(newDivision, oldDivision),
  };
}

/** True when `a` is a higher Division than `b` in the same line (MD or WD). */
function isHigherDivision(a: string, b: string): boolean {
  const sa = shortDivision(a);
  const sb = shortDivision(b);
  const ma = sa.match(/^(MD|WD)(\d)$/);
  const mb = sb.match(/^(MD|WD)(\d)$/);
  return Boolean(ma && mb && ma[1] === mb[1] && Number(ma[2]) < Number(mb[2]));
}

export const JUDGMENT_LABEL: Record<TryoutJudgment, string> = {
  PROMOTION: "昇格",
  KEEP: "残留",
  DEMOTION: "降格",
  INITIAL: "初回確定",
};
