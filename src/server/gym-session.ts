import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { hashPin, safeEqual, signToken, verifyPin, verifyToken } from "./crypto";
import { adminDb } from "./firebase-admin";

// Gym staff session (workflow diagram B-3): one account per venue, venue ID + password.
// Separate cookie from the athlete session; the payload carries kind "gym" so an athlete
// token can never be read as a gym token. Staff sign in again after 12 hours.

const COOKIE = "ob_gym";
const MAX_AGE_HOURS = 12;

// Plain-text password fields the current app holds (its "adminPasswordHash" is plain text despite
// the name; functions/src/index.ts gymLogin). Replaced by a real hash on first sign-in.
const LEGACY_PASSWORD_FIELDS = ["adminPasswordHash", "password", "パスワード"] as const;

type GymPayload = { kind: "gym"; venueId: string; exp: number };

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  }
  return s;
}

/** True when the password matches the venue's hash, or a legacy plain one (then upgrades it). */
export async function checkGymPassword(venueId: string, password: string): Promise<boolean> {
  const ref = adminDb().collection("venues").doc(venueId);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const d = snap.data()!;
  if (typeof d.gymPasswordHash === "string") return verifyPin(password.trim(), d.gymPasswordHash);
  const legacy = LEGACY_PASSWORD_FIELDS.map((f) => d[f]).find((v) => v !== undefined && v !== "");
  if (legacy === undefined || !safeEqual(String(legacy).trim(), password.trim())) return false;
  await ref.update({
    gymPasswordHash: await hashPin(password.trim()),
    ...Object.fromEntries(LEGACY_PASSWORD_FIELDS.map((f) => [f, FieldValue.delete()])),
  });
  return true;
}

export async function createGymSession(venueId: string): Promise<void> {
  const exp = Date.now() + MAX_AGE_HOURS * 60 * 60 * 1000;
  const payload: GymPayload = { kind: "gym", venueId, exp };
  (await cookies()).set(COOKIE, signToken(payload, secret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp),
  });
}

export async function deleteGymSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export type GymStaff = { venueId: string; venueName: string };

/** The signed-in venue, or null. Reads cookies, so callers must sit inside Suspense. */
export const getGymStaff = cache(async (): Promise<GymStaff | null> => {
  await connection();
  const payload = verifyToken<GymPayload>((await cookies()).get(COOKIE)?.value, secret());
  if (payload?.kind !== "gym" || !payload.venueId || !(payload.exp > Date.now())) return null;
  const snap = await adminDb().collection("venues").doc(payload.venueId).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return { venueId: snap.id, venueName: String(d.name ?? d["会場名"] ?? snap.id) };
});

/** For gym screens: sends signed-out staff to the gym login. */
export async function requireGym(): Promise<GymStaff> {
  const staff = await getGymStaff();
  if (!staff) redirect("/gym-admin/login");
  return staff;
}
