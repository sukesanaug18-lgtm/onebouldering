import type { EventKey } from "@/components/ui/Badge";

// Poster shown at the top of each event page. The office can replace it (stored in Firebase
// Storage, settings in site_settings/event_posters); until then the default below is used.

export const POSTER_EVENTS: { key: EventKey; label: string }[] = [
  { key: "tnfc", label: "THE NORTH FACE CUP" },
  { key: "tryout", label: "Division Tryout" },
  { key: "ranking", label: "ONE bouldering Ranking" },
];

export type Poster = { src: string; width: number; height: number; custom: boolean };

/** Built-in posters: the 2027 season posters (03_onebouldering用/04_ロゴ・スポンサー素材). */
export const DEFAULT_POSTERS: Record<EventKey, Poster | null> = {
  tnfc: { src: "/images/posters/tnfc_2027_poster.jpg", width: 1200, height: 1689, custom: false },
  tryout: {
    src: "/images/posters/tryout_2027_poster.jpg",
    width: 1200,
    height: 1700,
    custom: false,
  },
  ranking: {
    src: "/images/posters/ranking_2027_poster.jpg",
    width: 1200,
    height: 1500,
    custom: false,
  },
};

export const isPosterEvent = (v: string): v is EventKey => POSTER_EVENTS.some((e) => e.key === v);

export const posterPath = (event: EventKey) => `posters/${event}.webp`;
