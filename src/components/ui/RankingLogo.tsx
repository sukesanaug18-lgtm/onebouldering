import Image from "next/image";
import { cn } from "@/lib/cn";

/** Official ONE bouldering Ranking logo (490×220). `tone="dark"` uses the white version. */
export function RankingLogo({
  tone = "light",
  className,
  decorative = false,
}: {
  tone?: "light" | "dark";
  className?: string;
  /** True when the name is already written next to the logo. */
  decorative?: boolean;
}) {
  return (
    <Image
      src={
        tone === "dark"
          ? "/images/onebouldering_ranking_logo_white.png"
          : "/images/onebouldering_ranking_logo.png"
      }
      alt={decorative ? "" : "ONE bouldering Ranking"}
      width={490}
      height={220}
      sizes="240px"
      className={cn("h-16 w-auto", className)}
    />
  );
}
