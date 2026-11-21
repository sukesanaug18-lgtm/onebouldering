// Unified venue QR (/entry?venue=…): where to send a player (workflow diagram B-2).

import { UNDECIDED_DIVISION, canonicalDivision } from "./division.ts";

export type VenuePrograms = {
  hasTryout: boolean;
  tryoutPeriod: string;
  hasRanking: boolean;
  rankingPeriod: string;
};

/** Reads venue.programs; venues without it run both programs (current app behaviour). */
export function resolveVenuePrograms(venue: {
  period?: unknown;
  programs?: Partial<Record<keyof VenuePrograms, unknown>>;
}): VenuePrograms {
  const fallback = String(venue.period ?? "").trim() || "日付未定";
  const p = venue.programs;
  if (!p) {
    return { hasTryout: true, tryoutPeriod: fallback, hasRanking: true, rankingPeriod: fallback };
  }
  return {
    hasTryout: Boolean(p.hasTryout),
    tryoutPeriod: String(p.tryoutPeriod ?? "").trim() || fallback,
    hasRanking: p.hasRanking === undefined ? true : Boolean(p.hasRanking),
    rankingPeriod: String(p.rankingPeriod ?? "").trim() || fallback,
  };
}

export type EntryOption = { kind: "tryout" | "score"; recommended: boolean };

export type EntryDecision =
  | { kind: "login" }
  /** Division undecided and this venue has no Tryout: Ranking is locked. */
  | { kind: "needs-tryout-elsewhere" }
  /** Nothing to do at this venue (no programs, or a U category at a Tryout-only venue). */
  | { kind: "nothing" }
  | { kind: "choose"; options: EntryOption[] };

/**
 * Undecided players go to Tryout (or are told to find a Tryout venue).
 * Confirmed players get Ranking first when it runs; Tryout stays available to change Division.
 * U categories are age-based, so they never take a Tryout.
 */
export function decideEntry(input: {
  loggedIn: boolean;
  division?: string;
  programs: VenuePrograms;
}): EntryDecision {
  if (!input.loggedIn) return { kind: "login" };
  const div = canonicalDivision(input.division ?? UNDECIDED_DIVISION);
  const { hasTryout, hasRanking } = input.programs;

  if (div === UNDECIDED_DIVISION) {
    return hasTryout
      ? { kind: "choose", options: [{ kind: "tryout", recommended: true }] }
      : { kind: "needs-tryout-elsewhere" };
  }

  const options: EntryOption[] = [];
  if (hasRanking) options.push({ kind: "score", recommended: true });
  if (hasTryout && !div.startsWith("U-")) {
    options.push({ kind: "tryout", recommended: !hasRanking });
  }
  return options.length ? { kind: "choose", options } : { kind: "nothing" };
}
