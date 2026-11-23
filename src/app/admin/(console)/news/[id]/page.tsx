import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { isNewsVisible, todayJst } from "@/domain/news";
import { shortDate } from "@/features/mypage/components/MySection";
import { DeleteNewsButton, NewsForm } from "@/features/news/components/NewsForm";
import { getNewsForEdit, newsImageUrl } from "@/features/news/queries";
import { PageSkeleton } from "@/features/tnfc/components/Parts";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "NEWS の編集" };

async function Edit({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/news/[id]">["params"];
  searchParams: PageProps<"/admin/news/[id]">["searchParams"];
}) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const a = await getNewsForEdit(id);
  if (!a) notFound();
  const visible = isNewsVisible(a, todayJst());
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-3">
        {a.updatedBy && (
          <span>
            最終更新 {shortDate(a.updatedAt)}（{a.updatedBy}）
          </span>
        )}
        {visible && (
          <Link
            href={`/news/${a.id}`}
            target="_blank"
            className="inline-flex min-h-11 items-center gap-1 font-bold text-text hover:underline"
          >
            公開ページを見る
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <NewsForm
        values={{ ...a, imageUrl: newsImageUrl(a) }}
        notice={sp.saved ? "保存しました。" : undefined}
      />
      <section className="border-t border-line pt-8">
        <h2 className="mb-3 text-lg font-bold">削除</h2>
        <DeleteNewsButton id={a.id} />
      </section>
    </div>
  );
}

export default function EditNewsPage(props: PageProps<"/admin/news/[id]">) {
  return (
    <>
      <Link
        href="/admin/news"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        NEWS 一覧へ
      </Link>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">記事の編集</h1>
      <Suspense fallback={<PageSkeleton />}>
        <Edit params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
