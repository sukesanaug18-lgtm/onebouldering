// Year-end reset and U category moves (workflow diagram B-7, 1.5.1–1.5.2). Ported from the
// current app's computeAnnualRolloverPreview. Pure logic.

import { canonicalDivision, UNDECIDED_DIVISION } from "./division.ts";
import { ageAtFiscalYearEnd, recommendUCategory } from "./member.ts";

/** 1.5.1 Divisions that start the new season undecided (players take a Tryout again). */
export const RESET_DIVISIONS = [
  "Men‘s Division 5",
  "Men‘s Division 4",
  "Women‘s Division 4",
  "Women‘s Division 3",
] as const;

const U_CATEGORIES = new Set(["U-8", "U-10", "U-12M", "U-12W", "U-15M", "U-15W"]);

export const ROLLOVER_REASON = {
  division_reset: "Division リセット",
  u_category_advance: "U カテゴリー進級",
  u15_graduated: "U-15 卒業（16歳）",
} as const;
export type RolloverReason = keyof typeof ROLLOVER_REASON;

export type RolloverMember = {
  id: string;
  name: string;
  gender: string;
  division: string;
  birthDate: string;
};

export type RolloverChange = {
  userId: string;
  name: string;
  from: string;
  to: string;
  reason: RolloverReason;
};

/**
 * Changes for the start of `nextSeasonId` (e.g. "2028" = April 2027 – March 2028).
 * U categories follow the age on April 1 at the end of that season; at 16 a player becomes
 * undecided. U players without a usable birth date are listed in `missingBirthDate`.
 */
export function computeRollover(
  members: RolloverMember[],
  nextSeasonId: string,
): { changes: RolloverChange[]; missingBirthDate: RolloverMember[] } {
  const reset = new Set<string>(RESET_DIVISIONS);
  const changes: RolloverChange[] = [];
  const missingBirthDate: RolloverMember[] = [];
  for (const m of members) {
    const from = canonicalDivision(m.division);
    if (reset.has(from)) {
      changes.push({
        userId: m.id,
        name: m.name,
        from,
        to: UNDECIDED_DIVISION,
        reason: "division_reset",
      });
      continue;
    }
    if (!U_CATEGORIES.has(from)) continue;
    const birth = m.birthDate.trim();
    const age = ageAtFiscalYearEnd(birth, Number(nextSeasonId) - 1);
    if (age === null || age < 4) {
      missingBirthDate.push(m);
      continue;
    }
    const next = recommendUCategory(birth, m.gender, nextSeasonId);
    if (age > 15 || next === null) {
      changes.push({
        userId: m.id,
        name: m.name,
        from,
        to: UNDECIDED_DIVISION,
        reason: "u15_graduated",
      });
    } else if (next !== from) {
      changes.push({ userId: m.id, name: m.name, from, to: next, reason: "u_category_advance" });
    }
  }
  const order: RolloverReason[] = ["division_reset", "u_category_advance", "u15_graduated"];
  changes.sort(
    (a, b) =>
      order.indexOf(a.reason) - order.indexOf(b.reason) ||
      a.from.localeCompare(b.from) ||
      a.userId.localeCompare(b.userId, "ja", { numeric: true }),
  );
  return { changes, missingBirthDate };
}

/** Notification text for one player. */
export function rolloverMessage(c: RolloverChange, seasonLabel: string): string {
  const to = c.to === UNDECIDED_DIVISION ? "未確定" : c.to;
  const tail =
    c.to === UNDECIDED_DIVISION
      ? "参加ジムで Division Tryout を受けて、新しい Division を決めてください。"
      : "";
  return `${seasonLabel} シーズンの規定により、カテゴリーが「${c.from}」から「${to}」になりました。${tail}`;
}
