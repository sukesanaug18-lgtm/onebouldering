import { Inter, Noto_Sans_JP } from "next/font/google";

/** Japanese body text (CLAUDE.md 6-7). */
export const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

/**
 * Display face for English headings, numbers, buttons and navigation.
 * TODO: Replace with Cabinet Grotesk via next/font/local once the font files
 * are placed in src/app/fonts/ (e.g. CabinetGrotesk-Variable.woff2).
 * Inter is a temporary stand-in that matches the current site.
 */
export const displayFace = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-face",
});
