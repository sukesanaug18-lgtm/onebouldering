// Copying the current app's data into the new project (CLAUDE.md 3: データはコピーする).
// The old project is only read. These pure helpers decide what is copied and how the few
// fields that change shape are converted; scripts/copy-data.ts does the reading and writing.

import { NEWS_CATEGORIES, safeHref } from "./news.ts";

type Doc = Record<string, unknown>;

/** Collections copied document by document, with the same ids. */
export const COPY_COLLECTIONS = [
  "users",
  "venues",
  "participant_data",
  "tryout_logs",
  "competition_results",
  "point_master",
  "official_competitions",
  "tournament_results",
  "tnfc_rounds",
  "tnfc_entries",
  "tnfc_results",
  "tnfc_cancellations",
  "tnfc_sync_logs",
  "notifications",
  "site_settings",
  "news_articles",
] as const;
export type CopyCollection = (typeof COPY_COLLECTIONS)[number];

/**
 * site_settings documents left behind: the GA4 settings hold a service-account private key in
 * the current app, and the new site reads GA4 in Google's own console instead.
 */
export const SKIPPED_SETTINGS = new Set(["ga4_api_config", "ga4_config"]);

/** Plain-text secrets in the current data. The copy stores a hash and drops these fields. */
export const USER_PIN_FIELDS = ["pin", "pinCode", "password", "暗証番号"] as const;
export const VENUE_PASSWORD_FIELDS = ["adminPasswordHash", "password", "パスワード"] as const;

/** First non-empty plain secret among `fields`, or null. */
export function plainSecret(d: Doc, fields: readonly string[]): string | null {
  for (const f of fields) {
    const v = d[f];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return null;
}

/** The current app keeps NEWS in site_settings as news_* documents. */
export function isOldNewsDoc(id: string, d: Doc): boolean {
  return id.startsWith("news_") || d.docType === "news_article";
}

/** "news_20261017_launch" → "20261017-launch" (the new id format: a-z, 0-9, "-"). */
export function newsIdFromOld(id: string): string {
  const s = id
    .toLowerCase()
    .replace(/^news[_-]/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return s.length >= 6 ? s : `news-${s}`.padEnd(6, "0");
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
};

function decode(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k in ENTITIES) return ENTITIES[k];
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(Number(k.slice(1)));
    return m;
  });
}

/**
 * Old NEWS HTML → the new body format (## 見出し, - 項目, **太字**, [文字](URL), blank lines).
 * Styles, scripts and every other tag are dropped; only safe links are kept.
 */
export function htmlToNewsBody(html: string): string {
  let s = html.replace(/\r\n?/g, "\n");
  s = s.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Links first, so their text can still hold bold marks.
  s = s.replace(
    /<a\b[^>]*?href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, _q, href, text) => {
      const label = text
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const safe = safeHref(decode(href));
      return safe && label ? `[${label}](${safe})` : label;
    },
  );
  s = s.replace(
    /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    (_m, t) => `\n\n## ${t.replace(/\s+/g, " ").trim()}\n\n`,
  );
  s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, t) => `\n- ${t.replace(/\s+/g, " ").trim()}\n`);
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, t) => {
    const inner = t.trim();
    return inner ? `**${inner}**` : "";
  });
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|ul|ol|blockquote|figure|section|table)>/gi, "\n\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decode(s);
  return (
    s
      .split("\n")
      .map((l) => l.replace(/[ \t ]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/(^|\n)- \n/g, "$1")
      // Items of one list stay on consecutive lines.
      .replace(/(^- .*)\n\n(?=- )/gm, "$1\n")
      .trim()
  );
}

const dateOnly = (v: unknown) => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";
};

/** One old NEWS document → a news_articles document, or null when it has no title. */
export function oldNewsToArticle(id: string, d: Doc): { id: string; data: Doc } | null {
  const title = String(d.title ?? "").trim();
  if (!title) return null;
  const raw = String(d.content ?? d.body ?? "");
  const body = /<[a-z][\s\S]*>/i.test(raw) ? htmlToNewsBody(raw) : raw.trim();
  const category = NEWS_CATEGORIES.find((c) => c === d.category) ?? "お知らせ";
  const createdAt = String(d.createdAt ?? "");
  const publishedAt = dateOnly(d.publishedAt) || dateOnly(createdAt) || "2026-04-01";
  return {
    id: newsIdFromOld(id),
    data: {
      title,
      category,
      body: body || title,
      // "scheduled" in the old app is a published article with a future date here.
      status: d.status === "draft" ? "draft" : "published",
      publishedAt,
      isPinned: Boolean(d.isPinned),
      createdAt: createdAt || `${publishedAt}T00:00:00.000Z`,
      updatedAt: String(d.updatedAt ?? createdAt ?? ""),
      updatedBy: "copy",
      copiedFrom: id,
      ...(d.thumbnailUrl ? { oldThumbnailUrl: String(d.thumbnailUrl) } : {}),
    },
  };
}
