// Venue check-in for Tryout and Ranking input: a player may only enter results at a gym after
// reading that gym's own QR code (it carries a secret key) or confirming their location near
// the gym. A check-in lasts until the end of the day (Japan time).

export type LatLng = { lat: number; lng: number };

/** How close the phone must be to the gym. */
export const CHECKIN_RADIUS_M = 300;
/** GPS accuracy is added up to this much, so a weak indoor fix still works near the gym. */
export const MAX_ACCURACY_ALLOWANCE_M = 200;

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in meters (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const isLatLng = (v: Partial<LatLng> | null | undefined): v is LatLng =>
  typeof v?.lat === "number" &&
  typeof v?.lng === "number" &&
  Math.abs(v.lat) <= 90 &&
  Math.abs(v.lng) <= 180 &&
  !(v.lat === 0 && v.lng === 0);

/** Whether a reported position (with its accuracy in meters) counts as being at the gym. */
export function isNearVenue(here: LatLng, accuracy: number, venue: LatLng): boolean {
  const allowance = Math.min(Math.max(0, accuracy || 0), MAX_ACCURACY_ALLOWANCE_M);
  return distanceMeters(here, venue) - allowance <= CHECKIN_RADIUS_M;
}

/** End of the current day in Japan (next 00:00 JST) as epoch ms. */
export function endOfDayJst(now: number): number {
  const JST = 9 * 60 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  return Math.floor((now + JST) / day) * day + day - JST;
}

export type PassMap = Record<string, number>;

/** Adds a venue to the stored passes and drops expired ones (keeps at most 10). */
export function addPass(passes: PassMap, venueId: string, now: number): PassMap {
  const live = Object.entries(passes).filter(([id, exp]) => id !== venueId && exp > now);
  live.push([venueId, endOfDayJst(now)]);
  return Object.fromEntries(live.slice(-10));
}

export const hasPass = (passes: PassMap, venueId: string, now: number) =>
  (passes[venueId] ?? 0) > now;
