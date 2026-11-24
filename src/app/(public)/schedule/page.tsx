import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { EventKey } from "@/components/ui/Badge";
import { SITE_PAGES } from "@/content/site-pages";
import { eventDateLabel } from "@/features/schedule/format";
import { getSchedule, type RegionGroup } from "@/features/schedule/queries";
import { SitePageSkeleton } from "@/features/site-pages/components/SitePageSkeleton";
import { SitePageView } from "@/features/site-pages/components/SitePageView";
import { getSitePage } from "@/features/site-pages/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";

export const metadata: Metadata = {
  title: SITE_PAGES.schedule.title,
  description: SITE_PAGES.schedule.lead,
};

// TNFC rounds and the gyms' Tryout / Ranking periods come from the office screens
// (TNFC, 会場); the lead and the note below are edited under 事務局「ページ」.

const DOT: Record<EventKey, string> = {
  tnfc: "bg-event-tnfc",
  tryout: "bg-event-tryout",
  ranking: "bg-event-ranking",
};

function Heading({ event, title, href }: { event: EventKey; title: string; href: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
        <span className={`size-2.5 shrink-0 rounded-full ${DOT[event]}`} aria-hidden />
        {title}
      </h2>
      <Link href={href} className="text-sm font-bold underline underline-offset-4">
        詳しく見る
      </Link>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 rounded-xl bg-bg-subtle px-4 py-5 text-sm text-text-2">{children}</p>;
}

function Gyms({ groups }: { groups: RegionGroup[] }) {
  if (groups.length === 0) return <Empty>開催ジムは決まりしだい掲載します。</Empty>;
  return (
    <div className="mt-4 space-y-6">
      {groups.map((g) => (
        <div key={g.region}>
          <h3 className="text-sm font-bold text-text-3">{g.region}</h3>
          <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-white">
            {g.venues.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
              >
                <span className="font-bold">{v.name}</span>
                <span className="text-sm text-text-2 tabular-nums">{v.period}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

async function Content() {
  const [page, s] = await Promise.all([getSitePage("schedule"), getSchedule(CURRENT_SEASON_ID)]);
  return (
    <SitePageView page={page}>
      <section className="mt-12">
        <Heading event="tnfc" title="THE NORTH FACE CUP" href="/tnfc" />
        {s.rounds.length === 0 ? (
          <Empty>予選の日程は決まりしだい掲載します。</Empty>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white px-2">
            {s.rounds.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3">
                <span className="w-24 shrink-0 font-display text-xs font-bold tracking-wider text-text-3 uppercase">
                  {r.finals ? "本戦" : `ROUND ${r.roundNumber}`}
                </span>
                <span className="min-w-0 flex-1 font-bold">{r.venueName}</span>
                <span className="text-sm tabular-nums">{eventDateLabel(r.eventDate)}</span>
                {r.hasResults ? (
                  <Link
                    href={`/results/${r.id}`}
                    className="text-sm font-bold underline underline-offset-4"
                  >
                    リザルト
                  </Link>
                ) : (
                  r.entryDeadline && (
                    <span className="text-xs text-text-3">
                      締切 {eventDateLabel(r.entryDeadline)}
                    </span>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-12">
        <Heading event="tryout" title="Division Tryout" href="/tryout/about" />
        <Gyms groups={s.tryout} />
      </section>
      <section className="mt-12">
        <Heading event="ranking" title="ONE bouldering Ranking" href="/ranking/about" />
        <Gyms groups={s.ranking} />
      </section>
    </SitePageView>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<SitePageSkeleton />}>
      <Content />
    </Suspense>
  );
}
