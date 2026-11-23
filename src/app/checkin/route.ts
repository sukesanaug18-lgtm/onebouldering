import { NextResponse } from "next/server";
import { safeEqual } from "@/server/crypto";
import { adminDb } from "@/server/firebase-admin";
import { grantVenuePass } from "@/server/venue-pass";

/**
 * Target of a gym's own QR code: /checkin?venue=<id>&k=<secret key>.
 * A matching key checks the player in at that gym for the day, then goes on to /entry,
 * which sends them to Tryout or Ranking. A wrong or old key still opens /entry, where the
 * player can confirm by location instead.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const venueId = url.searchParams.get("venue") ?? "";
  const key = url.searchParams.get("k") ?? "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(venueId)) {
    return NextResponse.redirect(new URL("/entry", url));
  }
  const next = new URL(`/entry?venue=${encodeURIComponent(venueId)}`, url);
  try {
    const snap = await adminDb().collection("venues").doc(venueId).get();
    const stored = String(snap.data()?.qrKey ?? "");
    if (snap.exists && snap.data()?.visible !== false && stored && key && safeEqual(key, stored)) {
      await grantVenuePass(venueId, "qr");
    } else {
      next.searchParams.set("qr", "invalid");
    }
  } catch (err) {
    console.error("[checkin] failed", err);
    next.searchParams.set("qr", "error");
  }
  return NextResponse.redirect(next, { headers: { "Cache-Control": "no-store" } });
}
