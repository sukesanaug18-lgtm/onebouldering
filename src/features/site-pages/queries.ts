import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { SITE_PAGES, SITE_PAGE_SLUGS, type SitePageSlug } from "@/content/site-pages";
import { adminDb } from "@/server/firebase-admin";
import { withTimeout } from "@/server/timeout";

// Office-editable pages (rules, FAQ, prizes, sponsors, schedule note). A saved version in
// site_pages/{slug} replaces the built-in text (src/content/site-pages.ts) field by field.

export type SitePage = {
  slug: SitePageSlug;
  path: string;
  eyebrow: string;
  title: string;
  lead: string;
  body: string;
  /** True when the office saved its own text; false while the built-in text is shown. */
  edited: boolean;
  updatedAt: string;
  updatedBy: string;
};

export const isSitePageSlug = (s: string): s is SitePageSlug =>
  (SITE_PAGE_SLUGS as readonly string[]).includes(s);

function toPage(slug: SitePageSlug, d: FirebaseFirestore.DocumentData | undefined): SitePage {
  const base = SITE_PAGES[slug];
  return {
    ...base,
    lead: typeof d?.lead === "string" ? d.lead : base.lead,
    body: typeof d?.body === "string" && d.body.trim() ? d.body : base.body,
    edited: Boolean(d),
    updatedAt: String(d?.updatedAt ?? ""),
    updatedBy: String(d?.updatedBy ?? ""),
  };
}

/** For the office screens (always fresh). */
export async function getSitePageForEdit(slug: SitePageSlug): Promise<SitePage> {
  const snap = await adminDb().collection("site_pages").doc(slug).get();
  return toPage(slug, snap.data());
}

export async function listSitePages(): Promise<SitePage[]> {
  const snaps = await adminDb().getAll(
    ...SITE_PAGE_SLUGS.map((s) => adminDb().collection("site_pages").doc(s)),
  );
  return snaps.map((s, i) => toPage(SITE_PAGE_SLUGS[i], s.data()));
}

// Throws on errors so a failed read is never cached.
async function loadSitePage(slug: SitePageSlug): Promise<SitePage> {
  "use cache";
  cacheLife("hours");
  cacheTag("site-pages");
  const snap = await withTimeout(adminDb().collection("site_pages").doc(slug).get());
  return toPage(slug, snap.data());
}

/** The public page; the built-in text when Firestore cannot be read. */
export async function getSitePage(slug: SitePageSlug): Promise<SitePage> {
  await connection();
  try {
    return await loadSitePage(slug);
  } catch (err) {
    console.error(`[site-pages] failed to read ${slug}`, err);
    return toPage(slug, undefined);
  }
}
