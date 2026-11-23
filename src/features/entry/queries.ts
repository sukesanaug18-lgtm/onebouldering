import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { resolveVenuePrograms, type VenuePrograms } from "@/domain/entry";
import { isLatLng, type LatLng } from "@/domain/venue-pass";
import { adminDb } from "@/server/firebase-admin";

export type VenueDetail = {
  id: string;
  name: string;
  region: string;
  programs: VenuePrograms;
  /** Gym position for the location check-in; null when the office has not set it. */
  location: LatLng | null;
};

/** Stored as { location: { lat, lng } }; the old app kept lat / lng at the top level. */
export function venueLocation(v: FirebaseFirestore.DocumentData): LatLng | null {
  const src = (v.location ?? v) as Record<string, unknown>;
  const loc = { lat: Number(src.lat), lng: Number(src.lng) };
  return isLatLng(loc) ? loc : null;
}

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
    location: venueLocation(v),
  };
}

/** A participating gym with its programs, or null if unknown / hidden / unreachable. */
export async function getVenue(id: string | undefined): Promise<VenueDetail | null> {
  // Read at request time, never while building (the build has no data and must not bake it in).
  await connection();
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
