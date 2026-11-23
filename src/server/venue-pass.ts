import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { addPass, endOfDayJst, hasPass, type PassMap } from "@/domain/venue-pass";
import { signToken, verifyToken } from "./crypto";

// Venue check-in passes (signed, httpOnly cookie). Granted by the gym's own QR code
// (/checkin?venue=…&k=…) or by a location check near the gym. Required to open and send the
// Tryout and Ranking forms. One cookie holds the passes for up to 10 gyms for the day.

const COOKIE = "ob_venue";

export type CheckInMethod = "qr" | "location";
type Payload = { p: PassMap; m: Record<string, CheckInMethod> };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or too short.");
  return s;
}

async function read(): Promise<Payload> {
  const token = (await cookies()).get(COOKIE)?.value;
  const v = verifyToken<Payload>(token, secret());
  return v && typeof v.p === "object" && v.p ? { p: v.p, m: v.m ?? {} } : { p: {}, m: {} };
}

/** Records a check-in at a venue. Only call from a Route Handler or Server Action. */
export async function grantVenuePass(venueId: string, method: CheckInMethod): Promise<void> {
  const now = Date.now();
  const cur = await read();
  const p = addPass(cur.p, venueId, now);
  const m = Object.fromEntries(
    Object.entries({ ...cur.m, [venueId]: method }).filter(([id]) => id in p),
  );
  (await cookies()).set(COOKIE, signToken({ p, m }, secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(endOfDayJst(now)),
  });
}

/** For Server Actions: how the player checked in at this venue today, or null. */
export async function readCheckIn(venueId: string): Promise<CheckInMethod | null> {
  const cur = await read();
  return hasPass(cur.p, venueId, Date.now()) ? (cur.m[venueId] ?? "qr") : null;
}

/** For pages: the same as readCheckIn. Callers must sit inside Suspense. */
export async function venueCheckIn(venueId: string): Promise<CheckInMethod | null> {
  await connection();
  return readCheckIn(venueId);
}
