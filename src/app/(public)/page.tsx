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
import { SAMPLE_RANKING, SAMPLE_SPONSORS, SAMPLE_UPCOMING } from "@/content/home-sample";

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

export default function Home() {
  return (
    <main>
      <Hero />
      <EventCards />
      <Journey />
      <Upcoming items={SAMPLE_UPCOMING} />
      <RankingTop groups={SAMPLE_RANKING} />
      <Suspense fallback={<NewsList />}>
        <LatestNews />
      </Suspense>
      <Partners sponsors={SAMPLE_SPONSORS} gyms={GYMS} />
    </main>
  );
}
