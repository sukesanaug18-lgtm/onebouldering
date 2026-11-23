import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { NEWS_CATEGORIES } from "@/domain/news";
import { getPublishedNews } from "@/features/news/queries";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "お知らせ",
  description: "ONE Bouldering からのお知らせ。大会情報、会場追加、ルール更新など。",
};

async function NewsIndex({ searchParams }: { searchParams: PageProps<"/news">["searchParams"] }) {
  const sp = await searchParams;
  const category = NEWS_CATEGORIES.find((c) => c === sp.category) ?? null;
  const all = await getPublishedNews();
  const list = category ? all.filter((a) => a.category === category) : all;
  const chip = (active: boolean) =>
    cn(
      "inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-bold whitespace-nowrap transition-colors",
      active ? "border-text bg-text text-white" : "border-line bg-white hover:border-gray-300",
    );
  return (
    <>
      <nav aria-label="カテゴリー" className="-mx-5 mt-10 overflow-x-auto px-5">
        <ul className="flex min-w-max gap-2">
          <li>
            <Link
              href="/news"
              className={chip(!category)}
              aria-current={!category ? "page" : undefined}
            >
              すべて
            </Link>
          </li>
          {NEWS_CATEGORIES.map((c) => (
            <li key={c}>
              <Link
                href={`/news?category=${encodeURIComponent(c)}`}
                className={chip(category === c)}
                aria-current={category === c ? "page" : undefined}
              >
                {c}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {list.length === 0 ? (
        <p className="mt-10 text-text-2">まだお知らせはありません。</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                href={`/news/${a.id}`}
                className="flex flex-col gap-2 py-6 transition-colors duration-200 hover:text-text-2 md:flex-row md:gap-6"
              >
                <span className="flex shrink-0 items-center gap-3 md:w-56">
                  <time
                    dateTime={a.publishedAt}
                    className="font-display text-sm font-medium text-text-3 tabular-nums"
                  >
                    {a.publishedAt.replaceAll("-", ".")}
                  </time>
                  <Badge>{a.category}</Badge>
                </span>
                <span>
                  <span className="block font-bold">
                    {a.isPinned && <span className="mr-2 text-xs text-text-3">固定</span>}
                    {a.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm text-text-2">{a.excerpt}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function NewsPage({ searchParams }: PageProps<"/news">) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 pt-16 pb-24 md:pt-24">
      <p className="font-display text-sm font-bold tracking-widest text-text-3">NEWS</p>
      <h1 className="mt-2 text-[clamp(2rem,1.4rem+2.6vw,3.5rem)] leading-[1.2] font-bold tracking-tight">
        お知らせ
      </h1>
      <Suspense fallback={<div className="mt-10 h-96 animate-pulse rounded-2xl bg-bg-subtle" />}>
        <NewsIndex searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
