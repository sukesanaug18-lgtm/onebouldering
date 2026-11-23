"use server";

import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { getAdmin } from "@/server/admin-session";
import { hashPin } from "@/server/crypto";
import { adminDb } from "@/server/firebase-admin";
import { clearFailures } from "@/server/rate-limit";
import { rebuildRankingCache } from "@/server/ranking-cache";
import { VENUE_ID } from "./queries";

// Office edits to venues: programs and periods (drive the unified QR), visibility, and the gym
// staff password. Every change is kept in admin_logs.

export type VenueFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<string, string[]>>;
};

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";
const LEGACY_PASSWORD_FIELDS = ["adminPasswordHash", "password", "パスワード"] as const;

const name = z.string().trim().min(1, { error: "会場名を入力してください。" }).max(60);
const region = z.string().trim().min(1, { error: "地域を入力してください。" }).max(20);
const period = z.string().trim().max(40);

const VenueSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  name,
  region,
  visible: z.boolean(),
  hasTryout: z.boolean(),
  tryoutPeriod: period,
  hasRanking: z.boolean(),
  rankingPeriod: period,
});

const on = (v: FormDataEntryValue | null) => v === "on";

export async function updateVenue(_prev: VenueFormState, formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = VenueSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    region: formData.get("region"),
    visible: on(formData.get("visible")),
    hasTryout: on(formData.get("hasTryout")),
    tryoutPeriod: formData.get("tryoutPeriod") ?? "",
    hasRanking: on(formData.get("hasRanking")),
    rankingPeriod: formData.get("rankingPeriod") ?? "",
  });
  if (!parsed.success) {
    return {
      message: "入力内容を確認してください。",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;
  const db = adminDb();
  const ref = db.collection("venues").doc(v.id);
  const now = new Date().toISOString();

  try {
    const before = (await ref.get()).data();
    if (!before) return { message: "会場が見つかりません。" };
    const programs = {
      hasTryout: v.hasTryout,
      tryoutPeriod: v.tryoutPeriod,
      hasRanking: v.hasRanking,
      rankingPeriod: v.rankingPeriod,
    };
    await ref.update({
      name: v.name,
      会場名: v.name,
      region: v.region,
      地域: v.region,
      visible: v.visible,
      programs,
      updatedAt: now,
      updatedBy: admin.email,
    });
    await db.collection("admin_logs").add({
      action: "venue_update",
      venueId: v.id,
      by: admin.email,
      at: now,
      before: {
        name: before.name ?? "",
        region: before.region ?? "",
        visible: before.visible !== false,
        programs: before.programs ?? null,
      },
      after: { name: v.name, region: v.region, visible: v.visible, programs },
    });
    updateTag("venues");
    // The ranking groups gyms by name and region.
    if (
      before.name !== v.name ||
      before.region !== v.region ||
      (before.visible !== false) !== v.visible
    ) {
      await rebuildRankingCache(CURRENT_SEASON_ID);
      updateTag("ranking");
    }
    revalidatePath(`/admin/venues/${v.id}`);
    return { ok: true, message: "保存しました。QRコードの行き先にもすぐ反映されます。" };
  } catch (err) {
    console.error("[venue] update failed", err);
    return { message: "保存できませんでした。時間をおいて、もう一度お試しください。" };
  }
}

const CreateSchema = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(VENUE_ID, { error: "会場IDは半角英小文字・数字・ハイフンで入力してください。" }),
  name,
  region,
});

export async function createVenue(_prev: VenueFormState, formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = CreateSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    region: formData.get("region"),
  });
  if (!parsed.success) {
    return {
      message: "入力内容を確認してください。",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { id, name: venueName, region: venueRegion } = parsed.data;
  const db = adminDb();
  const now = new Date().toISOString();
  try {
    await db
      .collection("venues")
      .doc(id)
      .create({
        id,
        name: venueName,
        会場名: venueName,
        region: venueRegion,
        地域: venueRegion,
        // New venues start hidden with no programs; the office turns them on when ready.
        visible: false,
        programs: { hasTryout: false, tryoutPeriod: "", hasRanking: false, rankingPeriod: "" },
        createdAt: now,
        updatedAt: now,
        updatedBy: admin.email,
      });
    await db
      .collection("admin_logs")
      .add({ action: "venue_create", venueId: id, by: admin.email, at: now });
  } catch (err) {
    if ((err as { code?: number }).code === 6) {
      return {
        message: "この会場IDはすでに使われています。",
        errors: { id: ["この会場IDはすでに使われています。"] },
      };
    }
    console.error("[venue] create failed", err);
    return { message: "登録できませんでした。時間をおいて、もう一度お試しください。" };
  }
  updateTag("venues");
  redirect(`/admin/venues/${id}`);
}

export type PasswordState = { password?: string; message?: string };

/**
 * Sets a new gym staff password. Leave the field empty to generate one.
 * The password is shown to the office once and stored only as a hash.
 */
export async function setGymPassword(_prev: PasswordState, formData: FormData) {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const id = String(formData.get("id") ?? "");
  const typed = String(formData.get("password") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return { message: "会場が見つかりません。" };
  if (typed && (typed.length < 8 || typed.length > 64)) {
    return { message: "パスワードは8〜64文字にしてください。" };
  }
  // 10 characters from an alphabet without look-alikes (0/O, 1/l/I).
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const password = typed || [...randomBytes(10)].map((b) => alphabet[b % alphabet.length]).join("");

  const db = adminDb();
  const ref = db.collection("venues").doc(id);
  if (!(await ref.get()).exists) return { message: "会場が見つかりません。" };
  const now = new Date().toISOString();
  await ref.update({
    gymPasswordHash: await hashPin(password),
    ...Object.fromEntries(LEGACY_PASSWORD_FIELDS.map((f) => [f, FieldValue.delete()])),
    gymPasswordUpdatedAt: now,
    updatedAt: now,
    updatedBy: admin.email,
  });
  await clearFailures("gym", id);
  await db
    .collection("admin_logs")
    .add({ action: "gym_password", venueId: id, by: admin.email, at: now });
  return { password };
}
