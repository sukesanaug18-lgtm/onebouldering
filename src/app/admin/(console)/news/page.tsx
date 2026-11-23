import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { FormMessage } from "@/components/ui/Field";
import { newsStateLabel, todayJst } from "@/domain/news";
import { listAllNews } from "@/features/news/queries";
import { PageSkeleton } from "@/features/tnfc/components/Parts";
import { cn } from "@/lib/cn";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "NEWS" };

const tone: Record<string, string> = {
  公開中: "border-status-approved/30 text-status-approved",
  予約: "border-amber-300 text-amber-700",
  下書き: "border-line text-text-3",
};

async function NewsTable() {
  await requireAdmin();
  const list = await listAllNews();
  const today = todayJst();
  if (list.length === 0)
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-text-2">
        まだ記事はありません。「記事を書く」から作成してください。
      </p>
    );
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
      {list.map((a) => {
        const state = newsStateLabel(a, today);
        return (
          <li key={a.id}>
            <Link
              href={`/admin/news/${a.id}`}
              className="flex flex-col gap-1.5 px-5 py-4 hover:bg-bg-subtle md:flex-row md:items-center md:gap-4 md:px-6"
            >
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    "inline-flex w-14 justify-center rounded-full border px-2 py-0.5 text-xs font-bold",
                    tone[state],
                  )}
                >
                  {state}
                </span>
                <time className="text-sm text-text-3 tabular-nums">
                  {a.publishedAt.replaceAll("-", "/")}
                </time>
                <span className="text-xs text-text-3">{a.category}</span>
              </span>
              <span className="font-bold">
                {a.isPinned && <span className="mr-1.5 text-xs text-text-3">固定</span>}
                {a.title}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function AdminNewsPage({ searchParams }: PageProps<"/admin/news">) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NEWS</h1>
          <p className="mt-2 text-sm text-text-2">
            公開ページの「お知らせ」とトップページの最新3件に出ます。
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-text px-5 text-sm font-bold text-white hover:bg-[#333336]"
        >
          <Plus className="size-4" aria-hidden />
          記事を書く
        </Link>
      </div>
      <Suspense fallback={null}>
        <Deleted searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<PageSkeleton />}>
        <NewsTable />
      </Suspense>
    </>
  );
}

async function Deleted({
  searchParams,
}: {
  searchParams: PageProps<"/admin/news">["searchParams"];
}) {
  const sp = await searchParams;
  return sp.deleted ? (
    <div className="mb-6">
      <FormMessage tone="success">記事を削除しました。</FormMessage>
    </div>
  ) : null;
}
