import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { SitePageForm } from "@/features/site-pages/components/SitePageForm";
import { getSitePageForEdit, isSitePageSlug } from "@/features/site-pages/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "ページの編集" };

async function Editor({ params }: { params: PageProps<"/admin/pages/[slug]">["params"] }) {
  await requireAdmin();
  const { slug } = await params;
  if (!isSitePageSlug(slug)) notFound();
  const page = await getSitePageForEdit(slug);
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
          <p className="mt-1 text-sm text-text-3">
            {page.edited
              ? `最終更新 ${page.updatedAt.slice(0, 10)}・${page.updatedBy}`
              : "初期の文章を表示中です"}
          </p>
        </div>
        <a
          href={page.path}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-bold underline underline-offset-4"
        >
          公開ページを開く
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
      <SitePageForm slug={page.slug} lead={page.lead} body={page.body} edited={page.edited} />
    </>
  );
}

export default function AdminSitePageEdit({ params }: PageProps<"/admin/pages/[slug]">) {
  return (
    <>
      <Link
        href="/admin/pages"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        ページ一覧へ
      </Link>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-white" aria-busy="true" />}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}
