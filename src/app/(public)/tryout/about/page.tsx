import type { Metadata } from "next";
import { EventPage } from "@/features/events/components/EventPage";
import { getEventPoster } from "@/features/posters/queries";
import { TRYOUT_PAGE } from "@/content/event-pages";

export const metadata: Metadata = {
  title: "Division Tryout",
  description:
    "参加ジムで指定の6課題に挑戦して、自分のDivision（クラス）を決める Division Tryout の説明。",
};

export default async function Page() {
  return <EventPage content={TRYOUT_PAGE} poster={await getEventPoster("tryout")} />;
}
