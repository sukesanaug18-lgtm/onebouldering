import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { eventDateLabel } from "@/features/schedule/format";
import { getRoundsWithResults } from "@/features/schedule/queries";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";

export const metadata: Metadata = {
  title: "リザルト",
  description: "THE NORTH FACE CUP の予選・本戦のリザルト。",
};

async function RoundList() {
  const rounds = await getRoundsWithResults(CURRENT_SEASON_ID);
  if (rounds.length === 0) {
    return (
      <p className="mt-10 rounded-xl bg-bg-subtle px-4 py-5 text-sm text-text-2">
        まだ公開しているリザルトはありません。各予選の結果は、大会のあとにここに掲載します。
      </p>
    );
  }
  return (
    <ul className="mt-10 divide-y divide-line rounded-2xl border border-line bg-white">
      {rounds.map((r) => (
        <li key={r.id}>
          <Link href={`/results/${r.id}`} className="flex min-h-16 items-center gap-4 px-4 py-3">
            <span className="w-24 shrink-0 font-display text-xs font-bold tracking-wider text-text-3 uppercase">
              {r.finals ? "本戦" : `ROUND ${r.roundNumber}`}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{r.venueName}</span>
              <span className="text-sm text-text-2 tabular-nums">
                {eventDateLabel(r.eventDate)}
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-text-3" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ResultsPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-24 md:pt-20">
      <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
        Results
      </p>
      <h1 className="mt-2 text-[clamp(1.8rem,1.3rem+2vw,2.8rem)] leading-tight font-bold tracking-tight">
        リザルト
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-text-2">
        THE NORTH FACE CUP {seasonLabel(CURRENT_SEASON_ID)} の予選・本戦の結果です。ONE bouldering
        Ranking の順位は{" "}
        <Link href="/ranking" className="font-bold underline underline-offset-4">
          ランキング
        </Link>{" "}
        をご覧ください。
      </p>
      <Suspense fallback={<div className="mt-10 h-64 rounded-2xl bg-bg-subtle" aria-busy="true" />}>
        <RoundList />
      </Suspense>
    </main>
  );
}
