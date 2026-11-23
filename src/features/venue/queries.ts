import "server-only";
import { resolveVenuePrograms, type VenuePrograms } from "@/domain/entry";
import type { LatLng } from "@/domain/venue-pass";
import { venueLocation } from "@/features/entry/queries";
import { adminDb } from "@/server/firebase-admin";
import { SITE_URL } from "@/lib/site";

// Venues for the office (workflow diagram B-3 preparation: unified QR, programs, gym password).
// Read fresh (not cached) so the office always sees what it just saved.

// North to south, same order as the ranking region tabs.
const REGION_ORDER = ["北海道", "東北", "関東", "東海", "関西", "九州"];
const regionRank = (r: string) => {
  const i = REGION_ORDER.indexOf(r);
  return i < 0 ? REGION_ORDER.length : i;
};

export const VENUE_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

export type AdminVenue = {
  id: string;
  name: string;
  region: string;
  visible: boolean;
  programs: VenuePrograms;
  hasPassword: boolean;
  /** Secret part of the gym's own QR code (office only); null until the office issues one. */
  qrKey: string | null;
  /** Gym position for the location check-in. */
  location: LatLng | null;
  updatedAt: string;
  updatedBy: string;
};

function toVenue(id: string, v: FirebaseFirestore.DocumentData): AdminVenue {
  return {
    id,
    name: String(v.name ?? v["会場名"] ?? id),
    region: String(v.region ?? v["地域"] ?? ""),
    visible: v.visible !== false,
    programs: resolveVenuePrograms(v),
    hasPassword: Boolean(v.gymPasswordHash || v.adminPasswordHash || v.password || v["パスワード"]),
    qrKey: typeof v.qrKey === "string" && v.qrKey ? v.qrKey : null,
    location: venueLocation(v),
    updatedAt: String(v.updatedAt ?? ""),
    updatedBy: String(v.updatedBy ?? ""),
  };
}

export async function listAdminVenues(): Promise<AdminVenue[]> {
  const snap = await adminDb().collection("venues").get();
  return snap.docs
    .map((d) => toVenue(d.id, d.data()))
    .sort(
      (a, b) => regionRank(a.region) - regionRank(b.region) || a.name.localeCompare(b.name, "ja"),
    );
}

export async function getAdminVenue(id: string): Promise<AdminVenue | null> {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  const snap = await adminDb().collection("venues").doc(id).get();
  return snap.exists ? toVenue(snap.id, snap.data()!) : null;
}

/**
 * The gym's own QR target (workflow diagram B-2). Reading it checks the player in at the gym
 * for the day, then opens the unified entry. The key makes a QR that only exists at the gym.
 */
export function entryUrl(venueId: string, qrKey: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}/checkin?venue=${encodeURIComponent(venueId)}&k=${encodeURIComponent(qrKey)}`;
}
