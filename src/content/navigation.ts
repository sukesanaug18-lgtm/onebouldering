// Site navigation (CLAUDE.md 4, 6-8).

export type NavItem = { href: string; label: string; external?: boolean };

/** Desktop header links. */
export const MAIN_NAV: NavItem[] = [
  { href: "/tnfc", label: "THE NORTH FACE CUP" },
  { href: "/tryout/about", label: "Division Tryout" },
  { href: "/ranking", label: "Ranking" },
  { href: "/schedule", label: "日程" },
  { href: "/news", label: "NEWS" },
];

/** Mobile menu, grouped. */
export const MENU_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "イベント",
    items: [
      { href: "/tnfc", label: "THE NORTH FACE CUP" },
      { href: "/tryout/about", label: "Division Tryout" },
      { href: "/ranking/about", label: "ONE bouldering Ranking" },
    ],
  },
  {
    title: "参加する",
    items: [
      { href: "/join", label: "はじめての方へ" },
      { href: "/schedule", label: "日程・会場" },
      { href: "/results", label: "リザルト" },
      { href: "/rules", label: "ルール" },
      { href: "/faq", label: "よくある質問" },
    ],
  },
  {
    title: "ONE Bouldering",
    items: [
      { href: "/news", label: "NEWS" },
      { href: "/prizes", label: "協賛景品" },
      { href: "/sponsors", label: "オフィシャルスポンサー" },
      { href: "https://www.onebouldering.jp/contact/", label: "お問い合わせ", external: true },
    ],
  },
];

/** Links for gym staff, shown at the end of the menu and footer. */
export const GYM_NAV: NavItem[] = [{ href: "/gym-admin", label: "加盟ジムの方（店舗管理画面）" }];

/** Phone bottom tabs (6-8): home / events / schedule / my page. */
export const TAB_NAV = [
  { href: "/", label: "ホーム", icon: "home" },
  { href: "/join", label: "イベント", icon: "events" },
  { href: "/schedule", label: "日程", icon: "schedule" },
  { href: "/mypage", label: "マイページ", icon: "user" },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
