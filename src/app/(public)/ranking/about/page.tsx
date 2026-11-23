import type { Metadata } from "next";
import { EventPage } from "@/features/events/components/EventPage";
import { getEventPoster } from "@/features/posters/queries";
import { RANKING_PAGE } from "@/content/event-pages";

export const metadata: Metadata = {
  title: "ONE bouldering Ranking について",
  description:
    "全国の参加ジムの40課題と公認大会の成績で競う ONE bouldering Ranking の参加方法とルール。",
};

export default async function Page() {
  return <EventPage content={RANKING_PAGE} poster={await getEventPoster("ranking")} />;
}
