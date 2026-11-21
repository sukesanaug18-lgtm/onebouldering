import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { signToken, verifyToken } from "./crypto";

// Athlete session: a signed (HMAC) cookie holding the license number and an expiry.
// The cookie is httpOnly, so page scripts cannot read it.

const COOKIE = "ob_session";
const MAX_AGE_DAYS = 30;

type SessionPayload = { uid: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return s;
}

export async function createSession(uid: string): Promise<void> {
  const exp = Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  (await cookies()).set(COOKIE, signToken({ uid, exp }, secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** The signed-in license number, or null. Reads cookies, so callers must sit inside Suspense. */
export async function readSession(): Promise<{ uid: string } | null> {
  // Request-time only: the expiry check below uses the current time.
  await connection();
  const token = (await cookies()).get(COOKIE)?.value;
  const payload = verifyToken<SessionPayload>(token, secret());
  if (!payload?.uid || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
  return { uid: payload.uid };
}
