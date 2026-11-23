import type { Metadata } from "next";
import { Suspense } from "react";
import { EventPage } from "@/features/events/components/EventPage";
import { getEventPoster } from "@/features/posters/queries";
import { TNFC_PAGE } from "@/content/event-pages";

export const metadata: Metadata = {
  title: "THE NORTH FACE CUP",
  description: "全国の予選ラウンドから本戦へ。THE NORTH FACE CUP のエントリー、日程、ルール。",
};

async function WithPoster() {
  return <EventPage content={TNFC_PAGE} poster={await getEventPoster("tnfc")} />;
}

// The page text is built in advance; the poster set in the office is read per request.
export default function Page() {
  return (
    <Suspense fallback={<EventPage content={TNFC_PAGE} />}>
      <WithPoster />
    </Suspense>
  );
}
