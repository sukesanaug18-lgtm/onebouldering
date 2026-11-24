import { NewsBody } from "@/features/news/components/NewsBody";
import type { SitePage } from "../queries";

/** Public layout of an editable page: eyebrow, title, lead and body. */
export function SitePageView({ page, children }: { page: SitePage; children?: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-24 md:pt-20">
      <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
        {page.eyebrow}
      </p>
      <h1 className="mt-2 text-[clamp(1.8rem,1.3rem+2vw,2.8rem)] leading-tight font-bold tracking-tight">
        {page.title}
      </h1>
      {page.lead && <p className="mt-4 text-[15px] leading-relaxed text-text-2">{page.lead}</p>}
      {children}
      <div className="mt-10">
        <NewsBody body={page.body} />
      </div>
    </main>
  );
}
