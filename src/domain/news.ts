// NEWS articles (CLAUDE.md 4: news/). The body is plain text with a few marks, turned into
// blocks here and rendered as React elements, so no HTML from the database ever reaches the page.
//   ## 見出し        heading
//   - 項目           list item
//   [文字](URL)      link (https://… or a path on this site such as /tnfc)
//   **太字**         bold
//   blank line       new paragraph; a single line break stays a line break

export const NEWS_CATEGORIES = ["重要", "お知らせ", "大会情報", "会場追加", "ルール更新"] as const;
export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "br" };

export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "list"; items: Inline[][] };

/** Only web links and paths on this site (never javascript: and the like). */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

const INLINE =
  /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<>()]+[^\s<>().,、。])/g;

/** One line of text with links and bold. */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of line.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ type: "text", text: line.slice(last, at) });
    if (m[1] !== undefined) {
      const href = safeHref(m[2]);
      out.push(href ? { type: "link", text: m[1], href } : { type: "text", text: m[0] });
    } else if (m[3] !== undefined) {
      out.push({ type: "bold", text: m[3] });
    } else {
      out.push({ type: "link", text: m[4], href: m[4] });
    }
    last = at + m[0].length;
  }
  if (last < line.length) out.push({ type: "text", text: line.slice(last) });
  return out;
}

export function parseNewsBody(body: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) {
      const inlines: Inline[] = [];
      para.forEach((l, i) => {
        if (i > 0) inlines.push({ type: "br" });
        inlines.push(...parseInline(l));
      });
      blocks.push({ type: "paragraph", inlines });
      para = [];
    }
    if (list.length) {
      blocks.push({ type: "list", items: list.map(parseInline) });
      list = [];
    }
  };
  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flush();
    } else if (/^#{2,3}\s+/.test(line)) {
      flush();
      blocks.push({ type: "heading", text: line.replace(/^#{2,3}\s+/, "") });
    } else if (/^\s*[-・]\s+/.test(line)) {
      if (para.length) flush();
      list.push(line.replace(/^\s*[-・]\s+/, ""));
    } else {
      if (list.length) flush();
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

/** Plain-text summary for lists and meta descriptions. */
export function newsExcerpt(body: string, max = 100): string {
  const text = body
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/^#{2,3}\s+|^\s*[-・]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Today's date in Japan as YYYY-MM-DD. */
export function todayJst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
}

export type NewsStatus = "draft" | "published";

/** Shown to the public: published, and the publish date has come (Japan time). */
export function isNewsVisible(a: { status: string; publishedAt: string }, today: string): boolean {
  return a.status === "published" && a.publishedAt <= today;
}

/** Label for the office list. */
export function newsStateLabel(a: { status: string; publishedAt: string }, today: string) {
  if (a.status !== "published") return "下書き";
  return a.publishedAt > today ? "予約" : "公開中";
}

/** Pinned first, then newest publish date. */
export function sortNews<T extends { isPinned: boolean; publishedAt: string; createdAt: string }>(
  list: T[],
): T[] {
  return [...list].sort(
    (a, b) =>
      Number(b.isPinned) - Number(a.isPinned) ||
      b.publishedAt.localeCompare(a.publishedAt) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}
