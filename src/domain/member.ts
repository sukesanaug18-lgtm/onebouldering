// Member rules (CLAUDE.md 4: src/domain). Ported from the current app's tnfcLogic.ts /
// integratedLogic.ts so registration behaves the same.

export type Gender = "男性" | "女性" | "その他";
export const GENDERS: Gender[] = ["男性", "女性", "その他"];

/** First license number when nothing exists yet (current app: generateNextLicenseNo). */
export const FIRST_LICENSE_NO = 20001;

/**
 * Age at the end of a fiscal year (April 1 of `fiscalYear + 1`), the Japanese school-year rule.
 * Season "2027" = fiscal year 2026 (2026-04-01 – 2027-03-31).
 */
export function ageAtFiscalYearEnd(birthDate: string, fiscalYear: number): number | null {
  const m = birthDate.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  let age = fiscalYear + 1 - y;
  if (mo > 4 || (mo === 4 && d > 1)) age -= 1;
  return age;
}

/**
 * U category for a season from birth date and gender. Returns null for 16+ (general Divisions)
 * or for an invalid / implausible date.
 */
export function recommendUCategory(
  birthDate: string,
  gender: string,
  seasonId: string,
): string | null {
  const age = ageAtFiscalYearEnd(birthDate, Number(seasonId) - 1);
  if (age === null || age < 4 || age > 15) return null;
  const female = gender === "女性";
  if (age <= 8) return "U-8";
  if (age <= 10) return "U-10";
  if (age <= 12) return female ? "U-12W" : "U-12M";
  return female ? "U-15W" : "U-15M";
}

/** Next license number after the highest numeric id (ids of 9,000,000+ are ignored). */
export function nextLicenseNo(existingIds: string[], minStart = FIRST_LICENSE_NO): string {
  let max = minStart - 1;
  for (const raw of existingIds) {
    const id = String(raw ?? "").trim();
    if (!/^\d+$/.test(id)) continue;
    const n = Number(id);
    if (n < 9_000_000 && n > max) max = n;
  }
  return String(max + 1);
}

/** Only internal paths are allowed as a post-login destination (prevents open redirects). */
export function safeRedirectPath(raw: unknown, fallback = "/mypage"): string {
  const p = typeof raw === "string" ? raw.trim() : "";
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\")) return fallback;
  return p;
}
