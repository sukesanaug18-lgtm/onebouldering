import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Suspense } from "react";
import { JUDGMENT_LABEL } from "@/domain/tryout";
import { divisionLabel, ListSkeleton, shortDateTime } from "@/features/gym/components/RecordParts";
import { getVenueTryouts } from "@/features/gym/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { requireGym } from "@/server/gym-session";

export const metadata: Metadata = { title: "Tryout 履歴" };

// Tab 3 of diagram B-3: Tryouts taken at this gym. The result is final when the player sends
// it, so there is nothing to approve here; staff can download the list as CSV.

async function TryoutList() {
  const staff = await requireGym();
  const list = await getVenueTryouts(staff.venueId, CURRENT_SEASON_ID);
  if (list.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-white p-6 text-sm text-text-3">
        今シーズン、この会場で受けた Tryout はまだありません。
      </p>
    );
  }
  return (
    <>
      <p className="mb-3 text-sm text-text-3">{list.length}件</p>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white px-4 md:px-5">
        {list.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
          >
            <div className="min-w-0">
              <p className="font-bold">
                {t.name || "（不明）"}
                <span className="ml-2 text-sm font-medium text-text-3 tabular-nums">
                  No.{t.userId}
                </span>
              </p>
              <p className="text-sm text-text-2">
                <span className="tabular-nums">{shortDateTime(t.at)}</span> ・ {t.challenged} に挑戦
                ・ {t.completedCount}/6 完登
              </p>
            </div>
            <p className="font-bold whitespace-nowrap">
              {JUDGMENT_LABEL[t.judgment] ?? t.judgment}
              <span className="ml-2 font-display">
                {divisionLabel(t.oldDivision)} → {divisionLabel(t.newDivision)}
              </span>
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function GymTryoutsPage() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Tryout 履歴</h1>
        <a
          href="/api/gym/tryouts"
          download
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-5 text-sm font-bold hover:border-gray-300"
        >
          <Download className="size-4" aria-hidden />
          CSV をダウンロード
        </a>
      </div>
      <p className="mt-2 mb-6 text-sm text-text-2">
        この会場で受けた Division Tryout
        です。結果は選手の送信で確定するため、承認の操作はありません。
      </p>
      <Suspense fallback={<ListSkeleton />}>
        <TryoutList />
      </Suspense>
    </>
  );
}
