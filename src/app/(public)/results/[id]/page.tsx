import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import { eventDateLabel } from "@/features/schedule/format";
import { getPublicResults } from "@/features/schedule/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";

export const metadata: Metadata = { title: "リザルト" };

async function Results({ params }: { params: PageProps<"/results/[id]">["params"] }) {
  const data = await getPublicResults(CURRENT_SEASON_ID, (await params).id);
  if (!data) notFound();
  const { round, groups } = data;
  return (
    <>
      <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
        {round.finals ? "Finals" : `Round ${round.roundNumber}`}
      </p>
      <h1 className="mt-2 text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] leading-tight font-bold tracking-tight">
        {round.venueName}
      </h1>
      <p className="mt-2 text-text-2 tabular-nums">{eventDateLabel(round.eventDate)}</p>
      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.division}>
            <h2 className="text-lg font-bold">{divisionName(g.division)}</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-text-3">
                <tr className="border-b border-line">
                  <th className="w-16 py-2 pr-3 text-right font-bold">順位</th>
                  <th className="py-2 pr-3 font-bold">氏名</th>
                  {!round.finals && <th className="w-24 py-2 font-bold">本戦</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {g.rows.map((r, i) => (
                  <tr key={`${r.rank}-${i}`}>
                    <td className="py-2.5 pr-3 text-right font-bold tabular-nums">{r.rank}</td>
                    <td className="py-2.5 pr-3">{r.name}</td>
                    {!round.finals && <td className="py-2.5">{r.qualified ? "出場権" : ""}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    </>
  );
}

export default function RoundResultsPage({ params }: PageProps<"/results/[id]">) {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-24 md:pt-20">
      <Link
        href="/results"
        className="mb-8 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        リザルト一覧へ
      </Link>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-bg-subtle" aria-busy="true" />}>
        <Results params={params} />
      </Suspense>
    </main>
  );
}
