"use server";

import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath, updateTag } from "next/cache";
import sharp, { type OutputInfo } from "sharp";
import { getAdmin } from "@/server/admin-session";
import { adminBucket, adminDb } from "@/server/firebase-admin";
import { DEFAULT_POSTERS, isPosterEvent, posterPath } from "./config";

// Office: replace or reset the poster at the top of an event page. Uploads are re-encoded on
// the server (WebP, at most 1600px wide), which also drops metadata such as GPS.

export type PosterState = { ok?: boolean; message?: string };

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadPoster(_prev: PosterState, formData: FormData): Promise<PosterState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const event = String(formData.get("event") ?? "");
  if (!isPosterEvent(event)) return { message: "イベントが見つかりません。" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "画像を選んでください。" };
  if (!TYPES.includes(file.type)) return { message: "JPEG・PNG・WebP の画像を選んでください。" };
  if (file.size > MAX_BYTES) return { message: "画像が大きすぎます（15MBまで）。" };

  let out: { data: Buffer; info: OutputInfo };
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 80_000_000 })
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { message: "画像を読み込めませんでした。別の画像でお試しください。" };
  }
  if (out.info.height < out.info.width) {
    return { message: "縦長のポスター画像を選んでください。" };
  }

  const now = new Date().toISOString();
  const version = `${Date.now().toString(36)}${randomBytes(3).toString("hex")}`;
  try {
    await adminBucket()
      .file(posterPath(event))
      .save(out.data, {
        contentType: "image/webp",
        resumable: false,
        metadata: { cacheControl: "no-cache" },
      });
    await adminDb()
      .collection("site_settings")
      .doc("event_posters")
      .set(
        {
          [event]: {
            version,
            width: out.info.width,
            height: out.info.height,
            updatedAt: now,
            updatedBy: admin.email,
          },
        },
        { merge: true },
      );
    await adminDb()
      .collection("admin_logs")
      .add({ action: "poster_upload", event, by: admin.email, at: now, bytes: out.data.length });
  } catch (err) {
    console.error("[posters] upload failed", err);
    return { message: "保存できませんでした。時間をおいて、もう一度お試しください。" };
  }
  updateTag("posters");
  revalidatePath("/admin/posters");
  return { ok: true, message: "ポスターを差し替えました。イベントページにすぐ反映されます。" };
}

export async function resetPoster(_prev: PosterState, formData: FormData): Promise<PosterState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const event = String(formData.get("event") ?? "");
  if (!isPosterEvent(event)) return { message: "イベントが見つかりません。" };
  const now = new Date().toISOString();
  try {
    await adminDb()
      .collection("site_settings")
      .doc("event_posters")
      .set({ [event]: FieldValue.delete() }, { merge: true });
    await adminBucket().file(posterPath(event)).delete({ ignoreNotFound: true });
    await adminDb()
      .collection("admin_logs")
      .add({ action: "poster_reset", event, by: admin.email, at: now });
  } catch (err) {
    console.error("[posters] reset failed", err);
    return { message: "元に戻せませんでした。時間をおいて、もう一度お試しください。" };
  }
  updateTag("posters");
  revalidatePath("/admin/posters");
  return {
    ok: true,
    message: DEFAULT_POSTERS[event] ? "最初のポスターに戻しました。" : "ポスターを外しました。",
  };
}
