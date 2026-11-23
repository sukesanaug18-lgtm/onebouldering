// A4 schedule POP for gyms (CLAUDE.md 4: admin/tools/pop-a4): one page per region listing the
// gyms that run the Ranking, with their logo and period. Pure; the page passes the venues in.

export const POP_REGIONS = ["北海道", "東北", "関東", "東海", "関西", "九州"] as const;

export type PopVenueInput = {
  id: string;
  name: string;
  region: string;
  visible: boolean;
  hasRanking: boolean;
  period: string;
};
export type PopLogo = { src: string; dark?: boolean };
export type PopVenue = { id: string; name: string; period: string; logo: PopLogo | null };
export type PopPage = { region: string; venues: PopVenue[] };

const key = (s: string) => s.toLowerCase().replace(/[\s・._-]+/g, "");

/** Regions in north-to-south order, each with its Ranking gyms (hidden gyms left out). */
export function popPages(
  venues: PopVenueInput[],
  logos: { name: string; logo: string; dark?: boolean }[],
  region?: string,
): PopPage[] {
  const logoByName = new Map(logos.map((g) => [key(g.name), { src: g.logo, dark: g.dark }]));
  const regions = [
    ...POP_REGIONS,
    ...new Set(venues.map((v) => v.region).filter((r) => r && !POP_REGIONS.includes(r as never))),
  ];
  return regions
    .filter((r) => !region || r === region)
    .map((r) => ({
      region: r,
      venues: venues
        .filter((v) => v.region === r && v.visible && v.hasRanking)
        .map((v) => ({
          id: v.id,
          name: v.name,
          period: v.period.trim() || "日付未定",
          logo: logoByName.get(key(v.name)) ?? null,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "ja")),
    }))
    .filter((p) => p.venues.length > 0);
}
