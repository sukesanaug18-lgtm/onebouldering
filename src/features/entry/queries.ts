import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { resolveVenuePrograms, type VenuePrograms } from "@/domain/entry";
import { adminDb } from "@/server/firebase-admin";

export type VenueDetail = { id: string; name: string; region: string; programs: VenuePrograms };

/** Venue ids come from a QR code, so only accept simple slugs. */
const VENUE_ID = /^[A-Za-z0-9_-]{1,64}$/;

async function loadVenue(id: string): Promise<VenueDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("venues");
  const snap = await adminDb().collection("venues").doc(id).get();
  if (!snap.exists) return null;
  const v = snap.data()!;
  if (v.visible === false) return null;
  return {
    id: snap.id,
    name: String(v.name ?? v["会場名"] ?? snap.id),
    region: String(v.region ?? v["地域"] ?? "未定"),
    programs: resolveVenuePrograms(v),
  };
}

/** A participating gym with its programs, or null if unknown / hidden / unreachable. */
export async function getVenue(id: string | undefined): Promise<VenueDetail | null> {
  if (!id || !VENUE_ID.test(id)) return null;
  try {
    return await loadVenue(id);
  } catch (err) {
    console.error("[entry] failed to read venue", err);
    return null;
  }
}

/** First value of a search param. */
export function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
