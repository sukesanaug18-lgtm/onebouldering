import "server-only";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { isNewsVisible, newsExcerpt, sortNews, todayJst } from "@/domain/news";
import { adminDb } from "@/server/firebase-admin";
import { NEWS_ID } from "./paths";

// NEWS (news_articles). The public list is cached and refreshed hourly, so an article with a
// future publish date appears within about an hour of that day starting (Japan time). Saving in
// the office calls updateTag("news").

const text = (v: unknown) => String(v ?? "").trim();

export type NewsArticle = {
  id: string;
  title: string;
  category: string;
  body: string;
  excerpt: string;
  status: string;
  publishedAt: string;
  isPinned: boolean;
  image: { version: string; width: number; height: number } | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
};

function toArticle(id: string, d: FirebaseFirestore.DocumentData): NewsArticle {
  const body = text(d.body);
  const img = d.image as { version?: string; width?: number; height?: number } | undefined;
  return {
    id,
    title: text(d.title),
    category: text(d.category) || "お知らせ",
    body,
    excerpt: newsExcerpt(body),
    status: text(d.status) || "draft",
    publishedAt: text(d.publishedAt),
    isPinned: Boolean(d.isPinned),
    image: img?.version
      ? { version: img.version, width: Number(img.width ?? 0), height: Number(img.height ?? 0) }
      : null,
    createdAt: text(d.createdAt),
    updatedAt: text(d.updatedAt),
    updatedBy: text(d.updatedBy),
  };
}

/** Image URL (the bucket stays closed; the route reads it on the server). */
export const newsImageUrl = (a: Pick<NewsArticle, "id" | "image">) =>
  a.image ? `/api/news-images/${a.id}?v=${a.image.version}` : null;

/** Every article, drafts included (office). */
export async function listAllNews(): Promise<NewsArticle[]> {
  const snap = await adminDb().collection("news_articles").get();
  return sortNews(snap.docs.map((d) => toArticle(d.id, d.data())));
}

export async function getNewsForEdit(id: string): Promise<NewsArticle | null> {
  if (!NEWS_ID.test(id)) return null;
  const snap = await adminDb().collection("news_articles").doc(id).get();
  return snap.exists ? toArticle(snap.id, snap.data()!) : null;
}

/** Articles the public can see, pinned first. */
export async function getPublishedNews(): Promise<NewsArticle[]> {
  // Read at request time, never while building (the build has no data and must not bake it in).
  await connection();
  try {
    return await loadPublishedNews();
  } catch (err) {
    console.error("[news] failed to read news_articles", err);
    return [];
  }
}

// Throws on errors so a failed read is never cached.
async function loadPublishedNews(): Promise<NewsArticle[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("news");
  const today = todayJst();
  return (await listAllNews()).filter((a) => isNewsVisible(a, today));
}

/** Newest first, pins ignored (top page). */
export async function getLatestNews(limit = 3): Promise<NewsArticle[]> {
  const list = await getPublishedNews();
  return [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, limit);
}

export async function getPublishedArticle(id: string): Promise<NewsArticle | null> {
  if (!NEWS_ID.test(id)) return null;
  return (await getPublishedNews()).find((a) => a.id === id) ?? null;
}
