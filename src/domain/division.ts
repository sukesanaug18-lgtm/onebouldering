// Division names (CLAUDE.md 4: src/domain). Pure logic, no framework imports.
// Ported from the current app's integratedLogic.ts so stored Firestore values keep working.
// Stored names use a curly quote: "Men‘s Division 3".

export const UNDECIDED_DIVISION = "UNDECIDED";

export const CANONICAL_DIVISIONS = [
  "Men‘s Division 1",
  "Men‘s Division 2",
  "Men‘s Division 3",
  "Men‘s Division 4",
  "Men‘s Division 5",
  "Women‘s Division 1",
  "Women‘s Division 2",
  "Women‘s Division 3",
  "Women‘s Division 4",
  "U-15M",
  "U-15W",
  "U-12M",
  "U-12W",
  "U-10",
  "U-8",
] as const;

export type CanonicalDivision = (typeof CANONICAL_DIVISIONS)[number];

const SHORT: Record<string, string> = {
  "Men‘s Division 1": "MD1",
  "Men‘s Division 2": "MD2",
  "Men‘s Division 3": "MD3",
  "Men‘s Division 4": "MD4",
  "Men‘s Division 5": "MD5",
  "Women‘s Division 1": "WD1",
  "Women‘s Division 2": "WD2",
  "Women‘s Division 3": "WD3",
  "Women‘s Division 4": "WD4",
};

const FROM_SHORT: Record<string, string> = Object.fromEntries(
  Object.entries(SHORT).map(([long, short]) => [short, long]),
);

const U_ALIASES: Record<string, string> = {
  U8: "U-8",
  U10: "U-10",
  U12M: "U-12M",
  U12W: "U-12W",
  U15M: "U-15M",
  U15W: "U-15W",
};

/** Normalizes any stored spelling ("MD3", "Men's Division 3", "u15w", ...) to the canonical name. */
export function canonicalDivision(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  const key = trimmed.toUpperCase().replace(/[\s\-_'’‘]/g, "");
  if (key === UNDECIDED_DIVISION || trimmed === "未確定") return UNDECIDED_DIVISION;

  const m = key.match(/^(MEN|WOMEN)SDIVISION(\d)$/) ?? key.match(/^(M|W)D(\d)$/);
  if (m) {
    const short = `${m[1].startsWith("W") ? "W" : "M"}D${m[2]}`;
    if (FROM_SHORT[short]) return FROM_SHORT[short];
  }
  if (U_ALIASES[key]) return U_ALIASES[key];

  return trimmed
    .replace(/Men['’]s\s*Division/gi, "Men‘s Division")
    .replace(/Women['’]s\s*Division/gi, "Women‘s Division");
}

/** Short label for display and URLs: "Men‘s Division 3" → "MD3", "U-15M" → "U-15M". */
export function shortDivision(raw: string): string {
  const canon = canonicalDivision(raw);
  return SHORT[canon] ?? canon;
}

export function isRankedDivision(div: string): boolean {
  return Boolean(div) && div !== "-" && div !== "不明" && div !== UNDECIDED_DIVISION;
}
