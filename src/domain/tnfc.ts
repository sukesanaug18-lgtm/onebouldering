// THE NORTH FACE CUP rules (CLAUDE.md 4: src/domain). Ported from the current app's functions.

import { UNDECIDED_DIVISION } from "./division.ts";

/** Category name used by TNFC Control: "Men‘s Division 3" → "Division 3", women keep the prefix. */
export function tnfcControlCategory(canonDiv: string): string {
  if (!canonDiv || canonDiv === UNDECIDED_DIVISION) return "未確定";
  const m = canonDiv.match(/^Men[‘'’]s\s*Division\s*(\d+)$/i);
  if (m) return `Division ${m[1]}`;
  const w = canonDiv.match(/^Women[‘'’]s\s*Division\s*(\d+)$/i);
  if (w) return `Women's Division ${w[1]}`;
  return canonDiv;
}
