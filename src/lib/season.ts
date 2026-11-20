/** Current season (April–March). The 2026–27 season is stored as "2027" in Firestore. */
export const CURRENT_SEASON_ID = process.env.CURRENT_SEASON_ID ?? "2027";

export function seasonLabel(seasonId: string): string {
  const end = Number(seasonId);
  return Number.isFinite(end) ? `${end - 1}–${String(end).slice(2)}` : seasonId;
}
