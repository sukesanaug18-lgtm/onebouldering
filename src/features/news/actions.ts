"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import * as z from "zod";
import { NEWS_CATEGORIES, todayJst } from "@/domain/news";
import { getAdmin } from "@/server/admin-session";
import { adminBucket, adminDb } from "@/server/firebase-admin";
import { NEWS_ID, newsImagePath } from "./paths";

// Office: write, edit and delete NEWS articles (news_articles). One optional image per article,
// re-encoded on the server (WebP, at most 1600px wide, metadata such as GPS dropped).

export type NewsFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<"title" | "category" | "publishedAt" | "body" | "image", string[]>>;
};

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";
const MAX_BYTES = 15 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

const Schema = z.object({
  id: z.string().regex(NEWS_ID).or(z.literal("")),
  title: z.string().trim().min(1, "タイトルを入力してください。").max(120, "120文字までです。"),
  category: z.enum(NEWS_CATEGORIES, "カテゴリーを選んでください。"),
  publishedAt: z.iso.date("公開日を選んでください。"),
  body: z.string().trim().min(1, "本文を入力してください。").max(20000, "20,000文字までです。"),
  status: z.enum(["draft", "published"]),
  isPinned: z.boolean(),
  removeImage: z.boolean(),
});

export async function saveNews(_prev: NewsFormState, formData: FormData): Promise<NewsFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = Schema.safeParse({
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? ""),
    category: String(formData.get("category") ?? ""),
    publishedAt: String(formData.get("publishedAt") ?? ""),
    body: String(formData.get("body") ?? ""),
    status: formData.get("status") === "published" ? "published" : "draft",
    isPinned: formData.get("isPinned") === "on",
    removeImage: formData.get("removeImage") === "on",
  });
  if (!parsed.success) {
    return {
      message: "入力内容を確認してください。",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const v = parsed.data;

  let image: { data: Buffer; width: number; height: number } | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!TYPES.includes(file.type))
      return { errors: { image: ["JPEG・PNG・WebP の画像を選んでください。"] } };
    if (file.size > MAX_BYTES) return { errors: { image: ["画像が大きすぎます（15MBまで）。"] } };
    try {
      const out = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 80_000_000,
      })
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      image = { data: out.data, width: out.info.width, height: out.info.height };
    } catch {
      return { errors: { image: ["画像を読み込めませんでした。別の画像でお試しください。"] } };
    }
  }

  const db = adminDb();
  const isNew = !v.id;
  const id = v.id || `${v.publishedAt.replaceAll("-", "")}-${randomBytes(3).toString("hex")}`;
  const ref = db.collection("news_articles").doc(id);
  const now = new Date().toISOString();
  try {
    if (!isNew && !(await ref.get()).exists) return { message: "記事が見つかりません。" };
    const doc: Record<string, unknown> = {
      title: v.title,
      category: v.category,
      publishedAt: v.publishedAt,
      body: v.body,
      status: v.status,
      isPinned: v.isPinned,
      updatedAt: now,
      updatedBy: admin.email,
      ...(isNew ? { createdAt: now, createdBy: admin.email } : {}),
    };
    if (image) {
      await adminBucket()
        .file(newsImagePath(id))
        .save(image.data, {
          contentType: "image/webp",
          resumable: false,
          metadata: { cacheControl: "no-cache" },
        });
      doc.image = {
        version: `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`,
        width: image.width,
        height: image.height,
      };
    } else if (v.removeImage) {
      doc.image = null;
      await adminBucket().file(newsImagePath(id)).delete({ ignoreNotFound: true });
    }
    await ref.set(doc, { merge: true });
    await db.collection("admin_logs").add({
      action: isNew ? "news_create" : "news_update",
      by: admin.email,
      at: now,
      newsId: id,
      title: v.title,
      status: v.status,
    });
  } catch (err) {
    console.error("[news] save failed", err);
    return { message: "保存できませんでした。時間をおいて、もう一度お試しください。" };
  }
  updateTag("news");
  revalidatePath("/admin/news");
  if (isNew) redirect(`/admin/news/${id}?saved=1`);
  const when =
    v.status !== "published"
      ? "下書きとして保存しました（公開ページには出ません）。"
      : v.publishedAt > todayJst()
        ? `保存しました。${v.publishedAt.replaceAll("-", "/")} に公開されます。`
        : "保存しました。公開ページに反映されています。";
  return { ok: true, message: when };
}

export async function deleteNews(_prev: NewsFormState, formData: FormData): Promise<NewsFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const id = String(formData.get("id") ?? "");
  if (!NEWS_ID.test(id)) return { message: "記事が見つかりません。" };
  const ref = adminDb().collection("news_articles").doc(id);
  try {
    const snap = await ref.get();
    if (!snap.exists) return { message: "記事が見つかりません。" };
    await ref.delete();
    await adminBucket().file(newsImagePath(id)).delete({ ignoreNotFound: true });
    await adminDb()
      .collection("admin_logs")
      .add({
        action: "news_delete",
        by: admin.email,
        at: new Date().toISOString(),
        newsId: id,
        title: String(snap.data()!.title ?? ""),
      });
  } catch (err) {
    console.error("[news] delete failed", err);
    return { message: "削除できませんでした。時間をおいて、もう一度お試しください。" };
  }
  updateTag("news");
  revalidatePath("/admin/news");
  redirect("/admin/news?deleted=1");
}
