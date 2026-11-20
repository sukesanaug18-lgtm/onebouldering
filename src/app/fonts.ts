import localFont from "next/font/local";
import { Noto_Sans_JP } from "next/font/google";

/** Japanese body text (CLAUDE.md 6-7). */
export const notoSansJp = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

/**
 * Cabinet Grotesk: English headings, numbers, buttons and navigation.
 * Source: Fontshare (ITF Free Font License, see fonts/CabinetGrotesk-LICENSE.txt).
 */
export const displayFace = localFont({
  src: [
    { path: "./fonts/CabinetGrotesk-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/CabinetGrotesk-Bold.woff2", weight: "700", style: "normal" },
    { path: "./fonts/CabinetGrotesk-Extrabold.woff2", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-display-face",
});
