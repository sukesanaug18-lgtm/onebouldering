import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { CreateVenueForm } from "@/features/venue/components/VenueForms";
import { listAdminVenues } from "@/features/venue/queries";
import { cn } from "@/lib/cn";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "会場" };

function Tag({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap",
        on ? "bg-text text-white" : "border border-line text-text-3 line-through",
      )}
    >
      {children}
    </span>
  );
}

async function VenueList() {
  await requireAdmin();
  const venues = await listAdminVenues();
  const regions = [...new Set(venues.map((v) => v.region).filter(Boolean))];
  return (
    <div className="space-y-8">
      <p className="text-sm text-text-3">{venues.length}会場</p>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {venues.map((v) => (
          <li key={v.id}>
            <Link
              href={`/admin/venues/${v.id}`}
              className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 hover:bg-bg-subtle/60"
            >
              <span className="min-w-0 flex-1 basis-48">
                <span className="block truncate font-bold">
                  {v.name}
                  {!v.visible && (
                    <span className="ml-2 text-xs font-bold text-[#b91c1c]">非表示</span>
                  )}
                </span>
                <span className="block text-xs text-text-3">
                  {v.region || "地域未設定"} ・ {v.id}
                  {!v.hasPassword && " ・ 店舗パスワード未設定"}
                </span>
              </span>
              <span className="flex gap-1.5">
                <Tag on={v.programs.hasTryout}>Tryout</Tag>
                <Tag on={v.programs.hasRanking}>Ranking</Tag>
              </span>
              <ChevronRight className="size-4 shrink-0 text-text-3" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="mb-3 text-lg font-bold">会場を追加</h2>
        <Card className="bg-white">
          <p className="mb-4 text-sm text-text-2">
            追加した会場は「非表示・開催なし」で始まります。開催内容と店舗パスワードを設定してから表示してください。
          </p>
          <CreateVenueForm regions={regions} />
        </Card>
      </section>
    </div>
  );
}

export default function AdminVenuesPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">会場</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        加盟ジムごとの開催内容（Tryout・Ranking）と期間、店舗パスワード、統一 QR
        コードを管理します。
      </p>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-white" aria-busy="true" />}>
        <VenueList />
      </Suspense>
    </>
  );
}
