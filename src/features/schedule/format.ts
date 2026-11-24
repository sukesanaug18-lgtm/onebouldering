const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

/** "2026-09-26" → "2026.9.26（土）"; other text is returned as it is. */
export function eventDateLabel(date: string): string {
  const m = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return date || "日付未定";
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${m[1]}.${+m[2]}.${+m[3]}（${WEEK[d.getUTCDay()]}）`;
}
