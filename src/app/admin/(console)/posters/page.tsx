import type { Metadata } from "next";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { shortDate } from "@/features/mypage/components/MySection";
import { PosterForms } from "@/features/posters/components/PosterForms";
import { listPostersForAdmin } from "@/features/posters/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "ポスター" };

const PAGE_OF = { tnfc: "/tnfc", tryout: "/tryout/about", ranking: "/ranking/about" } as const;

async function PosterList() {
  await requireAdmin();
  const rows = await listPostersForAdmin();
  return (
    <ul className="space-y-6">
      {rows.map((r) => (
        <li key={r.key}>
          <Card className="bg-white">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="w-40 shrink-0">
                {r.poster ? (
                  <Image
                    src={r.poster.src}
                    alt={`${r.label} の今のポスター`}
                    width={r.poster.width}
                    height={r.poster.height}
                    unoptimized={r.poster.custom}
                    sizes="160px"
                    className="h-auto w-full rounded-xl border border-line"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-line text-xs text-text-3">
                    ポスターなし
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <h2 className="text-lg font-bold">{r.label}</h2>
                  <p className="text-sm text-text-3">
                    {r.poster?.custom
                      ? `アップロードしたポスター（${shortDate(r.updatedAt)}・${r.updatedBy}）`
                      : r.poster
                        ? "最初から入っているポスター"
                        : "まだポスターがありません"}
                  </p>
                  <a
                    href={PAGE_OF[r.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-bold underline underline-offset-4"
                  >
                    イベントページを開く
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </div>
                <PosterForms
                  event={r.key}
                  label={r.label}
                  custom={Boolean(r.poster?.custom)}
                  hasDefault={r.hasDefault}
                />
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPostersPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">ポスター</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        3つのイベントページの一番上に出すポスターを差し替えます。保存するとすぐに反映されます。
      </p>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-white" aria-busy="true" />}>
        <PosterList />
      </Suspense>
    </>
  );
}
