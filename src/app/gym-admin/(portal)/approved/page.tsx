import type { Metadata } from "next";
import { Suspense } from "react";
import { rejectScore, removeProblem } from "@/features/gym/actions";
import { GymActionForm, SubmitButton } from "@/features/gym/components/GymActionForm";
import { ListSkeleton, PlayerLine, RecordSearch } from "@/features/gym/components/RecordParts";
import { filterRecords, getVenueRecords } from "@/features/gym/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { requireGym } from "@/server/gym-session";

export const metadata: Metadata = { title: "承認済み" };

// Tab 2 of diagram B-3: approved scores. "課題確認・修正" opens the record: remove a single
// problem (stays approved, points recalculated, player notified) or send the whole record back.

async function ApprovedList({
  searchParams,
}: {
  searchParams: PageProps<"/gym-admin/approved">["searchParams"];
}) {
  const staff = await requireGym();
  const q = String((await searchParams).q ?? "");
  const all = (await getVenueRecords(staff.venueId, CURRENT_SEASON_ID))
    .filter((r) => r.status === "Approved")
    .sort((a, b) => b.points - a.points);
  const list = filterRecords(all, q);

  return (
    <div className="space-y-4">
      <RecordSearch q={q} action="/gym-admin/approved" />
      <p className="text-sm text-text-3">{list.length}件</p>
      {list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-text-3">
          {q ? `「${q}」に当てはまる承認済みはありません。` : "承認済みのスコアはまだありません。"}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="rounded-2xl border border-line bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <PlayerLine name={r.name} userId={r.userId} division={r.division} at={r.at} />
                <p className="text-right tabular-nums">
                  <span className="font-display text-2xl font-extrabold">{r.points}</span>
                  <span className="ml-0.5 text-xs">pt</span>
                  <span className="block text-xs text-text-3">{r.sent.length}課題</span>
                </p>
              </div>
              <details className="mt-3">
                <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full border border-line px-5 text-sm font-bold hover:border-gray-300 [&::-webkit-details-marker]:hidden">
                  課題確認・修正
                </summary>
                <div className="mt-4 space-y-6">
                  <GymActionForm
                    action={removeProblem}
                    confirmText="課題No.{value} を取り消します。ポイントが再計算され、選手にお知らせが届きます。よろしいですか？"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <p className="text-sm font-bold">1課題だけ取り消す</p>
                    <p className="mt-1 text-xs text-text-3">
                      取り消す課題の番号を押してください。承認済みのまま、ポイントだけ減ります。
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.sent.map((n) => (
                        <button
                          key={n}
                          type="submit"
                          name="no"
                          value={n}
                          aria-label={`課題No.${n} を取り消す`}
                          className="flex size-11 items-center justify-center rounded-lg border border-line bg-bg-subtle font-display text-sm font-bold tabular-nums transition-colors hover:border-status-rejected/50 hover:bg-status-rejected/5 hover:text-[#b91c1c]"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </GymActionForm>

                  <GymActionForm
                    action={rejectScore}
                    confirmText="承認を取り消して差し戻します。この記録のポイントはランキングから外れます。よろしいですか？"
                    className="border-t border-line pt-5"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="all" value="1" />
                    <label htmlFor={`reason-${r.id}`} className="text-sm font-bold">
                      全体を差し戻して、再提出してもらう
                    </label>
                    <textarea
                      id={`reason-${r.id}`}
                      name="reason"
                      required
                      maxLength={200}
                      rows={2}
                      placeholder="差し戻しの理由（選手に届きます）"
                      className="mt-2 block w-full rounded-xl border border-line bg-white px-4 py-3 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
                    />
                    <SubmitButton variant="danger" pendingText="送信中…" className="mt-2">
                      差し戻しにする
                    </SubmitButton>
                  </GymActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function GymApprovedPage(props: PageProps<"/gym-admin/approved">) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">承認済み</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        承認したスコアの確認と修正ができます。修正すると、ランキングと選手のマイページにすぐ反映されます。
      </p>
      <Suspense fallback={<ListSkeleton />}>
        <ApprovedList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
