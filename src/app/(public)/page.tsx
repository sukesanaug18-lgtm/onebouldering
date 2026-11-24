import { Suspense } from "react";
import { EventCards } from "@/features/home/components/EventCards";
import { Hero } from "@/features/home/components/Hero";
import { Journey } from "@/features/home/components/Journey";
import { NewsList } from "@/features/home/components/NewsList";
import { Partners } from "@/features/home/components/Partners";
import { RankingTop } from "@/features/home/components/RankingTop";
import { Upcoming } from "@/features/home/components/Upcoming";
import { GYMS } from "@/content/gyms";
import { getLatestNews } from "@/features/news/queries";
import { getHomeRankingTop, getHomeUpcoming } from "@/features/home/queries";

/** Top page: the hub for the three events (CLAUDE.md 5). Section order follows the design doc. */
async function LatestNews() {
  const list = await getLatestNews(3);
  return (
    <NewsList
      items={list.map((a) => ({
        date: a.publishedAt,
        category: a.category,
        title: a.title,
        href: `/news/${a.id}`,
      }))}
    />
  );
}

async function UpcomingSection() {
  return <Upcoming items={await getHomeUpcoming()} />;
}

async function RankingSection() {
  return <RankingTop groups={await getHomeRankingTop()} />;
}

export default function Home() {
  return (
    <main>
      <Hero />
      <EventCards />
      <Journey />
      <Suspense fallback={<Upcoming />}>
        <UpcomingSection />
      </Suspense>
      <Suspense fallback={<RankingTop />}>
        <RankingSection />
      </Suspense>
      <Suspense fallback={<NewsList />}>
        <LatestNews />
      </Suspense>
      <Partners gyms={GYMS} />
    </main>
  );
}
