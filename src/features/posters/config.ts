import type { EventKey } from "@/components/ui/Badge";

// Poster shown at the top of each event page. The office can replace it (stored in Firebase
// Storage, settings in site_settings/event_posters); until then the default below is used.

export const POSTER_EVENTS: { key: EventKey; label: string }[] = [
  { key: "tnfc", label: "THE NORTH FACE CUP" },
  { key: "tryout", label: "Division Tryout" },
  { key: "ranking", label: "ONE bouldering Ranking" },
];

export type Poster = { src: string; width: number; height: number; custom: boolean };

/** Built-in posters. TNFC has none yet (the existing images are result lists with names). */
export const DEFAULT_POSTERS: Record<EventKey, Poster | null> = {
  tnfc: null,
  tryout: {
    src: "/images/posters/tryout_split_poster.jpg",
    width: 819,
    height: 1024,
    custom: false,
  },
  ranking: {
    src: "/images/posters/ranking_overview_poster.jpg",
    width: 2121,
    height: 3000,
    custom: false,
  },
};

export const isPosterEvent = (v: string): v is EventKey => POSTER_EVENTS.some((e) => e.key === v);

export const posterPath = (event: EventKey) => `posters/${event}.webp`;
