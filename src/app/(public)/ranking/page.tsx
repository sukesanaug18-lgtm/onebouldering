import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RankingBoard, RankingBoardSkeleton } from "@/features/ranking/components/RankingBoard";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";

export const metadata: Metadata = {
  title: "ランキング",
  description:
    "ONE bouldering Ranking の総合・地域別・店舗別ランキング。Divisionごとの順位を確認できます。",
};

/** Ranking board (CLAUDE.md 4: ranking/). Filters live in the URL. */
export default function RankingPage({ searchParams }: PageProps<"/ranking">) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 pt-16 pb-24 md:pt-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Badge event="ranking">ONE bouldering Ranking</Badge>
          <h1 className="mt-4 text-[clamp(2rem,1.4rem+2.6vw,3.5rem)] leading-[1.2] font-bold tracking-tight">
            ランキング
          </h1>
          <p className="mt-2 font-display text-text-3">Season {seasonLabel(CURRENT_SEASON_ID)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button href="/ranking/about" variant="text">
            ルールと参加方法
          </Button>
          <Button href="/score" variant="secondary">
            スコアを提出する
          </Button>
        </div>
      </div>

      <div className="mt-12">
        <Suspense fallback={<RankingBoardSkeleton />}>
          <RankingBoard searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
