import "server-only";
import { firebaseApiKey } from "./firebase-config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { adminAuth } from "./firebase-admin";

// Office staff session (CLAUDE.md 3: Firebase Authentication + custom claims).
// The server signs in with the Auth REST API (no Firebase SDK in the browser), checks the
// `admin: true` claim, and stores a Firebase session cookie (httpOnly). Each request verifies
// the cookie with revocation checks, so disabling a staff account takes effect at once.

const COOKIE = "ob_admin";
const MAX_AGE_MS = 8 * 60 * 60 * 1000;

function authBaseUrl(): string {
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  return emulator
    ? `http://${emulator}/identitytoolkit.googleapis.com/v1`
    : "https://identitytoolkit.googleapis.com/v1";
}

function apiKey(): string {
  const key = firebaseApiKey();
  if (key) return key;
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return "demo-api-key";
  throw new Error("FIREBASE_API_KEY is missing.");
}

export type AdminSignIn = { ok: true; idToken: string } | { ok: false; reason: "wrong" | "error" };

/** Email + password sign-in through the Auth REST API. Returns an ID token on success. */
export async function signInWithPassword(email: string, password: string): Promise<AdminSignIn> {
  try {
    const res = await fetch(`${authBaseUrl()}/accounts:signInWithPassword?key=${apiKey()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
      cache: "no-store",
    });
    const body = (await res.json()) as { idToken?: string; error?: { message?: string } };
    if (res.ok && body.idToken) return { ok: true, idToken: body.idToken };
    const msg = String(body.error?.message ?? "");
    const wrong = /INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND|USER_DISABLED/.test(
      msg,
    );
    return { ok: false, reason: wrong ? "wrong" : "error" };
  } catch (err) {
    console.error("[admin] sign-in request failed", err);
    return { ok: false, reason: "error" };
  }
}

/** Creates the session cookie when the ID token carries the admin claim. */
export async function createAdminSession(idToken: string): Promise<boolean> {
  const decoded = await adminAuth().verifyIdToken(idToken);
  if (decoded.admin !== true) return false;
  const cookie = await adminAuth().createSessionCookie(idToken, { expiresIn: MAX_AGE_MS });
  (await cookies()).set(COOKIE, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  });
  return true;
}

export async function deleteAdminSession(): Promise<void> {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (!value) return;
  try {
    const decoded = await adminAuth().verifySessionCookie(value);
    await adminAuth().revokeRefreshTokens(decoded.sub);
  } catch {
    // Already invalid; nothing to revoke.
  }
}

export type AdminStaff = { uid: string; email: string };

/** The signed-in office staff member, or null. Reads cookies (callers sit inside Suspense). */
export const getAdmin = cache(async (): Promise<AdminStaff | null> => {
  await connection();
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(value, true);
    if (decoded.admin !== true) return null;
    return { uid: decoded.uid, email: String(decoded.email ?? "") };
  } catch {
    return null;
  }
});

/** For office screens: sends signed-out visitors to the office login. */
export async function requireAdmin(): Promise<AdminStaff> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
