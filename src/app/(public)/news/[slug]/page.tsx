import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { NewsBody } from "@/features/news/components/NewsBody";
import { getPublishedArticle, newsImageUrl } from "@/features/news/queries";

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const a = await getPublishedArticle((await params).slug);
  return a ? { title: a.title, description: a.excerpt } : { title: "お知らせ" };
}

async function Article({ params }: { params: PageProps<"/news/[slug]">["params"] }) {
  const a = await getPublishedArticle((await params).slug);
  if (!a) notFound();
  const img = newsImageUrl(a);
  return (
    <article>
      <div className="flex items-center gap-3">
        <time
          dateTime={a.publishedAt}
          className="font-display text-sm font-medium text-text-3 tabular-nums"
        >
          {a.publishedAt.replaceAll("-", ".")}
        </time>
        <Badge>{a.category}</Badge>
      </div>
      <h1 className="mt-4 text-[clamp(1.6rem,1.2rem+1.6vw,2.4rem)] leading-[1.35] font-bold tracking-tight">
        {a.title}
      </h1>
      {img && a.image && (
        <Image
          src={img}
          alt=""
          width={a.image.width}
          height={a.image.height}
          unoptimized
          className="mt-8 h-auto w-full rounded-2xl border border-line"
        />
      )}
      <div className="mt-10">
        <NewsBody body={a.body} />
      </div>
    </article>
  );
}

export default function NewsArticlePage({ params }: PageProps<"/news/[slug]">) {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-24 md:pt-20">
      <Link
        href="/news"
        className="mb-8 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        お知らせ一覧へ
      </Link>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-bg-subtle" />}>
        <Article params={params} />
      </Suspense>
    </main>
  );
}
