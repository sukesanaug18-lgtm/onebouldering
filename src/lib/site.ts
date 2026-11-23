/**
 * Site-wide constants. The production domain is not decided yet, so the
 * site URL always comes from NEXT_PUBLIC_SITE_URL (CLAUDE.md 7-6).
 */
export const SITE_NAME = "ONE Bouldering";

export const SITE_DESCRIPTION =
  "THE NORTH FACE CUP、Division Tryout、ONE bouldering Ranking の3イベントをひとつにまとめた公式サイト。";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Set SITE_DOMAIN_FINAL=1 once the production domain is fixed (QR POPs warn until then). */
export const DOMAIN_IS_FINAL = process.env.SITE_DOMAIN_FINAL === "1";
