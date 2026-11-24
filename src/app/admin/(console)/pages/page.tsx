import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { shortDate } from "@/features/mypage/components/MySection";
import { listSitePages } from "@/features/site-pages/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "ページ" };

async function PageList() {
  await requireAdmin();
  const pages = await listSitePages();
  return (
    <Card className="bg-white">
      <ul className="divide-y divide-line">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/admin/pages/${p.slug}`}
              className="flex min-h-16 items-center gap-4 py-3 hover:bg-bg-subtle/60"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bold">{p.title}</p>
                <p className="text-sm text-text-3">
                  {p.path} ・{" "}
                  {p.edited
                    ? `編集済み（${shortDate(p.updatedAt)}・${p.updatedBy}）`
                    : "初期の文章"}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-text-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function AdminPagesPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">ページ</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        ルール・よくある質問・協賛景品・スポンサー・日程ページの文章を書き換えます。保存するとすぐに公開ページに反映されます。
      </p>
      <Suspense fallback={<div className="h-80 rounded-2xl bg-white" aria-busy="true" />}>
        <PageList />
      </Suspense>
    </>
  );
}
