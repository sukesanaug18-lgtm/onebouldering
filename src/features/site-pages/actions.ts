"use server";

import { revalidatePath, updateTag } from "next/cache";
import * as z from "zod";
import { SITE_PAGES, SITE_PAGE_SLUGS } from "@/content/site-pages";
import { getAdmin, requireAdmin } from "@/server/admin-session";
import { adminDb } from "@/server/firebase-admin";

// Office: rewrite the rules / FAQ / prizes / sponsors pages and the schedule note.

export type SitePageFormState = {
  ok?: boolean;
  message?: string;
  errors?: Partial<Record<"lead" | "body", string[]>>;
};

const EXPIRED = "ログインの有効期限が切れました。もう一度ログインしてください。";

const Schema = z.object({
  slug: z.enum(SITE_PAGE_SLUGS),
  lead: z.string().trim().max(300, "300文字までです。"),
  body: z.string().trim().min(1, "本文を入力してください。").max(40000, "40,000文字までです。"),
});

export async function saveSitePage(
  _prev: SitePageFormState,
  formData: FormData,
): Promise<SitePageFormState> {
  const admin = await getAdmin();
  if (!admin) return { message: EXPIRED };
  const parsed = Schema.safeParse({
    slug: String(formData.get("slug") ?? ""),
    lead: String(formData.get("lead") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
  if (!parsed.success) {
    return {
      message: "入力内容を確認してください。",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }
  const { slug, lead, body } = parsed.data;
  const now = new Date().toISOString();
  try {
    const db = adminDb();
    await db
      .collection("site_pages")
      .doc(slug)
      .set({ lead, body, updatedAt: now, updatedBy: admin.email });
    await db
      .collection("admin_logs")
      .add({ action: "site_page_save", page: slug, by: admin.email, at: now });
  } catch (err) {
    console.error("[site-pages] save failed", err);
    return { message: "保存できませんでした。時間をおいて、もう一度お試しください。" };
  }
  updateTag("site-pages");
  revalidatePath(SITE_PAGES[slug].path);
  revalidatePath("/admin/pages", "layout");
  return { ok: true, message: "保存しました。公開ページにすぐ反映されます。" };
}

/** Back to the built-in text (deletes the saved version). */
export async function resetSitePage(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const slug = z.enum(SITE_PAGE_SLUGS).safeParse(String(formData.get("slug") ?? ""));
  if (!slug.success) return;
  const db = adminDb();
  await db.collection("site_pages").doc(slug.data).delete();
  await db.collection("admin_logs").add({
    action: "site_page_reset",
    page: slug.data,
    by: admin.email,
    at: new Date().toISOString(),
  });
  updateTag("site-pages");
  revalidatePath(SITE_PAGES[slug.data].path);
  revalidatePath("/admin/pages", "layout");
}
