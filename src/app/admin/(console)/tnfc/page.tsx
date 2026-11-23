import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { CreateRoundForm } from "@/features/tnfc/components/TnfcForms";
import { listRounds, nextRoundDefaults, ROUND_STATUS } from "@/features/tnfc/queries";
import { listAdminVenues } from "@/features/venue/queries";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC" };

const dateLabel = (d: string) => (d ? d.replaceAll("-", "/") : "日程未定");

async function RoundList() {
  await requireAdmin();
  const [rounds, venues, defaults] = await Promise.all([
    listRounds(CURRENT_SEASON_ID),
    listAdminVenues(),
    nextRoundDefaults(CURRENT_SEASON_ID),
  ]);
  return (
    <div className="space-y-8">
      {rounds.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-text-2">
          今シーズンの予選はまだありません。下のフォームから追加してください。
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {rounds.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/tnfc/${r.id}`}
                className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-bg-subtle/60"
              >
                <span className="font-display text-sm font-bold text-text-3">
                  ROUND{r.roundNumber}
                </span>
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block truncate font-bold">{r.venueName}</span>
                  <span className="block text-xs text-text-3">
                    {dateLabel(r.eventDate)}
                    {r.entryDeadline && ` ・ 締切 ${dateLabel(r.entryDeadline)}`}
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  {r.entries}人
                  {r.cancelled > 0 && (
                    <span className="text-text-3">（キャンセル {r.cancelled}）</span>
                  )}
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-xs font-bold whitespace-nowrap">
                  {ROUND_STATUS[r.status]}
                </span>
                <ChevronRight className="size-4 shrink-0 text-text-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">予選を追加</h2>
        <Card className="bg-white">
          <CreateRoundForm venues={venues} defaults={defaults} />
        </Card>
      </section>
    </div>
  );
}

export default function AdminTnfcPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">THE NORTH FACE CUP</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        Season {seasonLabel(CURRENT_SEASON_ID)}{" "}
        の予選。大会ごとに、エントリーの取り込み・締切前チェック・ゼッケン採番・CSV 出力を行います。
      </p>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-white" aria-busy="true" />}>
        <RoundList />
      </Suspense>
    </>
  );
}
