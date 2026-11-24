import type { Metadata } from "next";
import { Suspense } from "react";
import { SITE_PAGES } from "@/content/site-pages";
import { SitePageSkeleton } from "@/features/site-pages/components/SitePageSkeleton";
import { SitePageView } from "@/features/site-pages/components/SitePageView";
import { getSitePage } from "@/features/site-pages/queries";

const PAGE = SITE_PAGES.faq;

export const metadata: Metadata = { title: PAGE.title, description: PAGE.lead };

// The text is edited in the office (事務局「ページ」) and read per request.
async function Content() {
  return <SitePageView page={await getSitePage("faq")} />;
}

export default function FaqPage() {
  return (
    <Suspense fallback={<SitePageSkeleton />}>
      <Content />
    </Suspense>
  );
}
