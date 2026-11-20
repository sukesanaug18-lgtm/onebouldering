import type { Metadata } from "next";
import { EventPage } from "@/features/events/components/EventPage";
import { TNFC_PAGE } from "@/content/event-pages";

export const metadata: Metadata = {
  title: "THE NORTH FACE CUP",
  description: "全国の予選ラウンドから本戦へ。THE NORTH FACE CUP のエントリー、日程、ルール。",
};

export default function Page() {
  return <EventPage content={TNFC_PAGE} />;
}
