import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import type { EventKey } from "@/components/ui/Badge";
import { adminDb } from "@/server/firebase-admin";
import { DEFAULT_POSTERS, POSTER_EVENTS, type Poster } from "./config";

type Stored = {
  version?: string;
  width?: number;
  height?: number;
  updatedAt?: string;
  updatedBy?: string;
};

async function loadPosterSettings(): Promise<Record<string, Stored>> {
  "use cache";
  cacheLife("hours");
  cacheTag("posters");
  const snap = await adminDb().collection("site_settings").doc("event_posters").get();
  return (snap.data() ?? {}) as Record<string, Stored>;
}

function toPoster(event: EventKey, s: Stored | undefined): Poster | null {
  if (s?.version && s.width && s.height) {
    return {
      src: `/api/posters/${event}?v=${encodeURIComponent(s.version)}`,
      width: s.width,
      height: s.height,
      custom: true,
    };
  }
  return DEFAULT_POSTERS[event];
}

/** The poster for an event page (uploaded one, else the default, else none). */
export async function getEventPoster(event: EventKey): Promise<Poster | null> {
  // Read at request time, never while building (the build has no data and must not bake it in).
  await connection();
  try {
    return toPoster(event, (await loadPosterSettings())[event]);
  } catch (err) {
    // Outside the cache, so a failed read is not kept: show the default poster this time.
    console.error("[posters] failed to read settings", err);
    return DEFAULT_POSTERS[event];
  }
}

export type PosterAdminRow = {
  key: EventKey;
  label: string;
  poster: Poster | null;
  hasDefault: boolean;
  updatedAt: string;
  updatedBy: string;
};

/** Every event's poster for the office screen (read fresh). */
export async function listPostersForAdmin(): Promise<PosterAdminRow[]> {
  const snap = await adminDb().collection("site_settings").doc("event_posters").get();
  const data = (snap.data() ?? {}) as Record<string, Stored>;
  return POSTER_EVENTS.map((e) => ({
    key: e.key,
    label: e.label,
    poster: toPoster(e.key, data[e.key]),
    hasDefault: DEFAULT_POSTERS[e.key] !== null,
    updatedAt: String(data[e.key]?.updatedAt ?? ""),
    updatedBy: String(data[e.key]?.updatedBy ?? ""),
  }));
}
