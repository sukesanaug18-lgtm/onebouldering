import type { Metadata } from "next";
import { EventPage } from "@/features/events/components/EventPage";
import { TRYOUT_PAGE } from "@/content/event-pages";

export const metadata: Metadata = {
  title: "Division Tryout",
  description:
    "参加ジムで指定の6課題に挑戦して、自分のDivision（クラス）を決める Division Tryout の説明。",
};

export default function Page() {
  return <EventPage content={TRYOUT_PAGE} />;
}
