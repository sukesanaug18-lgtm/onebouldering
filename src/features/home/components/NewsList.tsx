import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { NewsItem } from "@/content/home-sample";

/** Latest 3 news (CLAUDE.md 5-6). Without items it shows placeholder rows (while loading). */
export function NewsList({ items }: { items?: NewsItem[] }) {
  return (
    <Section aria-labelledby="news-title">
      <SectionHeading
        id="news-title"
        eyebrow="News"
        title="お知らせ"
        action={
          <Button href="/news" variant="text">
            すべてのお知らせ
          </Button>
        }
      />
      <FadeIn className="mt-8">
        {items?.length === 0 && <p className="text-text-2">まだお知らせはありません。</p>}
        <ul className="divide-y divide-line border-y border-line empty:hidden">
          {!items &&
            [0, 1, 2].map((i) => (
              <li key={i} aria-hidden className="py-5">
                <span className="block h-6 w-2/3 animate-pulse rounded bg-bg-subtle" />
              </li>
            ))}
          {items?.map((item) => (
            <li key={item.title}>
              <Link
                href={item.href}
                className="flex flex-col gap-2 py-5 transition-colors duration-200 hover:text-text-2 md:flex-row md:items-center md:gap-6"
              >
                <span className="flex shrink-0 items-center gap-3">
                  <time
                    dateTime={item.date}
                    className="font-display text-sm font-medium text-text-3 tabular-nums"
                  >
                    {item.date.replaceAll("-", ".")}
                  </time>
                  <Badge className="md:w-24 md:justify-center">{item.category}</Badge>
                </span>
                <span className="font-bold">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </FadeIn>
    </Section>
  );
}
