import type { Metadata } from "next";
import { Suspense } from "react";
import { EventPage } from "@/features/events/components/EventPage";
import { getEventPoster } from "@/features/posters/queries";
import { TRYOUT_PAGE } from "@/content/event-pages";

export const metadata: Metadata = {
  title: "Division Tryout",
  description:
    "参加ジムで指定の6課題に挑戦して、自分のDivision（クラス）を決める Division Tryout の説明。",
};

async function WithPoster() {
  return <EventPage content={TRYOUT_PAGE} poster={await getEventPoster("tryout")} />;
}

// The page text is built in advance; the poster set in the office is read per request.
export default function Page() {
  return (
    <Suspense fallback={<EventPage content={TRYOUT_PAGE} />}>
      <WithPoster />
    </Suspense>
  );
}
