import type { Metadata } from "next";
import { Suspense } from "react";
import { problemSendRates } from "@/domain/gym";
import { getVenueRecords, getVenueTryouts } from "@/features/gym/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { requireGym } from "@/server/gym-session";

export const metadata: Metadata = { title: "集計" };

// Tab 4 of diagram B-3: counts for the venue and the send rate of problems No.1–40.

const pct = (r: number) => `${Math.round(r * 100)}%`;

async function Stats() {
  const staff = await requireGym();
  const [records, tryouts] = await Promise.all([
    getVenueRecords(staff.venueId, CURRENT_SEASON_ID),
    getVenueTryouts(staff.venueId, CURRENT_SEASON_ID),
  ]);
  const count = (s: string) => records.filter((r) => r.status === s).length;
  const { total, rates } = problemSendRates(records.map((r) => r.raw));
  const tiles = [
    { label: "承認待ち", value: count("Pending") },
    { label: "承認済み", value: count("Approved") },
    { label: "差し戻し", value: count("Rejected") },
    { label: "Tryout 受験", value: tryouts.length },
    { label: "うち昇格", value: tryouts.filter((t) => t.judgment === "PROMOTION").length },
    { label: "Division 確定", value: tryouts.filter((t) => t.judgment === "INITIAL").length },
  ];

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
            <dt className="text-sm text-text-3">{t.label}</dt>
            <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums">
              {t.value}
              <span className="ml-1 text-sm font-bold text-text-3">件</span>
            </dd>
          </div>
        ))}
      </dl>

      <section className="rounded-2xl border border-line bg-white p-4 md:p-6">
        <h2 className="font-bold">課題別の完登率</h2>
        <p className="mt-1 text-sm text-text-3">
          承認待ち・承認済みの {total} 人のうち、各課題を完登した人の割合（差し戻しは除く）
        </p>
        {total === 0 ? (
          <p className="mt-4 text-sm text-text-3">まだ提出がありません。</p>
        ) : (
          <>
            <div className="mt-6 flex gap-2">
              <div
                aria-hidden
                className="flex h-40 flex-col justify-between text-right text-[11px] text-text-3 tabular-nums"
              >
                <span>100%</span>
                <span>50%</span>
                <span>0%</span>
              </div>
              <div className="min-w-0 flex-1">
                <div
                  role="img"
                  aria-label="課題No.1〜40 の完登率の棒グラフ。数値は下の表にあります。"
                  className="relative grid h-40 grid-cols-[repeat(40,minmax(0,1fr))] items-end gap-[2px] border-b border-line"
                >
                  <div
                    aria-hidden
                    className="absolute inset-x-0 top-1/2 border-t border-dashed border-line"
                  />
                  {rates.map((r) => (
                    <div
                      key={r.no}
                      title={`No.${r.no}：${pct(r.rate)}（${r.sent}/${total}人）`}
                      className="group relative flex h-full items-end"
                    >
                      <div
                        className="w-full rounded-t-[4px] bg-text transition-colors group-hover:bg-event-ranking"
                        style={{ height: `${Math.max(r.rate * 100, r.sent ? 2 : 0)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div
                  aria-hidden
                  className="mt-1 grid grid-cols-[repeat(40,minmax(0,1fr))] text-center text-[10px] text-text-3 tabular-nums"
                >
                  {rates.map((r) => (
                    <span key={r.no}>{r.no % 5 === 0 || r.no === 1 ? r.no : ""}</span>
                  ))}
                </div>
              </div>
            </div>
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-bold text-text-2">
                数値を表で見る
              </summary>
              <table className="mt-3 w-full text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-line text-left text-text-3">
                    <th className="py-2 font-medium">課題</th>
                    <th className="py-2 text-right font-medium">完登</th>
                    <th className="py-2 text-right font-medium">完登率</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.no} className="border-b border-line/60">
                      <td className="py-1.5">No.{r.no}</td>
                      <td className="py-1.5 text-right">{r.sent}人</td>
                      <td className="py-1.5 text-right font-bold">{pct(r.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>
    </div>
  );
}

export default function GymStatsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">集計</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">今シーズンのこの会場の数字です。</p>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-white" aria-busy="true" />}>
        <Stats />
      </Suspense>
    </>
  );
}
