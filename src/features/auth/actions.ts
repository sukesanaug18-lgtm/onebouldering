"use server";

import { FieldValue } from "firebase-admin/firestore";
import { redirect } from "next/navigation";
import * as z from "zod";
import { UNDECIDED_DIVISION } from "@/domain/division";
import {
  FIRST_LICENSE_NO,
  nextLicenseNo,
  recommendUCategory,
  safeRedirectPath,
} from "@/domain/member";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { hashPin, safeEqual, verifyPin } from "@/server/crypto";
import { adminDb } from "@/server/firebase-admin";
import { clearFailures, lockedMinutes, recordFailure } from "@/server/rate-limit";
import { createSession, deleteSession } from "@/server/session";
import { LoginSchema, RegisterSchema, ResetPinSchema, type FormState } from "./schemas";

// Plain-text PIN fields used by the current app. Removed as soon as a hash is stored.
const LEGACY_PIN_FIELDS = ["pin", "pinCode", "password", "暗証番号"] as const;
const WRONG_LOGIN = "ライセンスNo.または暗証番号が違います。";

function fields(formData: FormData) {
  return Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)]));
}

function withoutSecrets(values: Record<string, string>) {
  const { pin: _pin, pinConfirm: _pinConfirm, ...rest } = values;
  return rest;
}

function lockedMessage(minutes: number) {
  return `入力を何度か間違えたため、一時的にロックしています。${minutes}分ほど待ってからお試しください。`;
}

/** True when the PIN matches the stored hash, or a legacy plain-text PIN (then upgrades it). */
async function checkPin(uid: string, data: FirebaseFirestore.DocumentData, pin: string) {
  if (typeof data.pinHash === "string") return verifyPin(pin, data.pinHash);
  const legacy = LEGACY_PIN_FIELDS.map((f) => data[f]).find((v) => v !== undefined && v !== "");
  if (legacy === undefined || !safeEqual(String(legacy), pin)) return false;
  await adminDb()
    .collection("users")
    .doc(uid)
    .update({
      pinHash: await hashPin(pin),
      ...Object.fromEntries(LEGACY_PIN_FIELDS.map((f) => [f, FieldValue.delete()])),
    });
  return true;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = fields(formData);
  const parsed = LoginSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: withoutSecrets(values) };
  }
  const { licenseNo, pin } = parsed.data;

  const locked = await lockedMinutes("login", licenseNo);
  if (locked) return { message: lockedMessage(locked), values: withoutSecrets(values) };

  const snap = await adminDb().collection("users").doc(licenseNo).get();
  if (!snap.exists || !(await checkPin(licenseNo, snap.data()!, pin))) {
    await recordFailure("login", licenseNo);
    return { message: WRONG_LOGIN, values: withoutSecrets(values) };
  }

  await clearFailures("login", licenseNo);
  await createSession(licenseNo);
  redirect(safeRedirectPath(values.redirect));
}

/** Issues the next license number with a counter document, so two sign-ups never collide. */
async function issueLicenseNo(tx: FirebaseFirestore.Transaction): Promise<string> {
  const db = adminDb();
  const counterRef = db.collection("counters").doc("licenseNo");
  const counter = await tx.get(counterRef);
  let last = Number(counter.data()?.last ?? 0);
  if (!counter.exists) {
    // First run: start after the highest existing numeric id (current app behavior).
    const ids = (await db.collection("users").select().get()).docs.map((d) => d.id);
    last = Number(nextLicenseNo(ids, FIRST_LICENSE_NO)) - 1;
  }
  let candidate = last + 1;
  // Skip ids that already exist (e.g. created by the current app after the counter started).
  while ((await tx.get(db.collection("users").doc(String(candidate)))).exists) candidate += 1;
  tx.set(counterRef, { last: candidate, updatedAt: new Date().toISOString() });
  return String(candidate);
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = fields(formData);
  const parsed = RegisterSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: withoutSecrets(values) };
  }
  const { name, furigana, birthDate, gender, email, pin } = parsed.data;

  // Under 16: U category from the birth date. 16+: undecided until Division Tryout.
  const division = recommendUCategory(birthDate, gender, CURRENT_SEASON_ID) ?? UNDECIDED_DIVISION;
  const pinHash = await hashPin(pin);
  const now = new Date().toISOString();

  const db = adminDb();
  const licenseNo = await db.runTransaction(async (tx) => {
    const id = await issueLicenseNo(tx);
    tx.set(db.collection("users").doc(id), {
      id,
      userId: id,
      name,
      displayName: name,
      furigana,
      kana: furigana,
      gender,
      division,
      divisionStatus: division === UNDECIDED_DIVISION ? "undecided" : "confirmed",
      email,
      birthDate,
      生年月日: birthDate,
      pinHash,
      registeredAt: now,
      updatedAt: now,
    });
    return id;
  });

  await createSession(licenseNo);
  return { ok: true, licenseNo };
}

/** A stored birth date ("2010-05-03", "2010/5/3") as YYYY-MM-DD, or "" when unreadable. */
function sameDate(v: unknown): string {
  // A Firestore Timestamp (old data): the date in Japan time.
  if (v && typeof v === "object" && "toDate" in v && typeof v.toDate === "function") {
    const d = new Date((v.toDate() as Date).getTime() + 9 * 3600_000);
    return d.toISOString().slice(0, 10);
  }
  const m = String(v ?? "")
    .trim()
    .match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : "";
}

export async function resetPin(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = fields(formData);
  const parsed = ResetPinSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values: withoutSecrets(values) };
  }
  const { licenseNo, email, birthDate, pin } = parsed.data;

  const locked = await lockedMinutes("reset", licenseNo);
  if (locked) return { message: lockedMessage(locked), values: withoutSecrets(values) };

  const ref = adminDb().collection("users").doc(licenseNo);
  const snap = await ref.get();
  const saved = String(snap.data()?.email ?? snap.data()?.["メールアドレス"] ?? "");
  // License numbers are public on the ranking, so the birth date is checked as well.
  const savedBirth = sameDate(snap.data()?.birthDate ?? snap.data()?.["生年月日"]);
  if (
    !snap.exists ||
    !saved ||
    saved.trim().toLowerCase() !== email.toLowerCase() ||
    !savedBirth ||
    savedBirth !== birthDate
  ) {
    await recordFailure("reset", licenseNo);
    return {
      message:
        "ライセンスNo.・メールアドレス・生年月日のどれかが登録内容と一致しません。わからないときは事務局にお問い合わせください。",
      values: withoutSecrets(values),
    };
  }

  await ref.update({
    pinHash: await hashPin(pin),
    updatedAt: new Date().toISOString(),
    ...Object.fromEntries(LEGACY_PIN_FIELDS.map((f) => [f, FieldValue.delete()])),
  });
  await clearFailures("reset", licenseNo);
  await clearFailures("login", licenseNo);
  return { ok: true, licenseNo };
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/");
}
