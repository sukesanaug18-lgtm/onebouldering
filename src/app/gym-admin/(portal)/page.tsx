import type { Metadata } from "next";
import { Suspense } from "react";
import { approveScores, rejectScore } from "@/features/gym/actions";
import { GymActionForm, SubmitButton } from "@/features/gym/components/GymActionForm";
import {
  ListSkeleton,
  PlayerLine,
  ProblemTiles,
  RecordSearch,
} from "@/features/gym/components/RecordParts";
import { SelectAll } from "@/features/gym/components/SelectAll";
import { filterRecords, getVenueRecords } from "@/features/gym/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { requireGym } from "@/server/gym-session";

export const metadata: Metadata = { title: "承認待ち" };

// Tab 1 of diagram B-3: check Pending scores and approve them one by one or together,
// or send one back with a reason (the player gets a notification).

async function PendingList({
  searchParams,
}: {
  searchParams: PageProps<"/gym-admin">["searchParams"];
}) {
  const staff = await requireGym();
  const q = String((await searchParams).q ?? "");
  const all = (await getVenueRecords(staff.venueId, CURRENT_SEASON_ID))
    .filter((r) => r.status === "Pending")
    .sort((a, b) => a.at.localeCompare(b.at));
  const list = filterRecords(all, q);

  return (
    <div className="space-y-4">
      <RecordSearch q={q} action="/gym-admin" />
      {list.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-text-3">
          {q ? `「${q}」に当てはまる承認待ちはありません。` : "承認待ちのスコアはありません。"}
        </p>
      ) : (
        <>
          <GymActionForm
            id="bulk"
            action={approveScores}
            confirmText="チェックした記録をまとめて承認します。よろしいですか？"
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white px-4 py-3"
          >
            <SelectAll form="bulk" />
            <SubmitButton pendingText="承認中…">チェックした記録をまとめて承認</SubmitButton>
          </GymActionForm>

          <ul className="space-y-3">
            {list.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line bg-white p-4 md:p-5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="id"
                    value={r.id}
                    form="bulk"
                    aria-label={`${r.name} さんを選ぶ`}
                    className="mt-1 size-5 shrink-0 accent-text"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <PlayerLine name={r.name} userId={r.userId} division={r.division} at={r.at} />
                      <p className="text-right tabular-nums">
                        <span className="font-display text-2xl font-extrabold">{r.points}</span>
                        <span className="ml-0.5 text-xs">pt</span>
                        {r.approved.length > 0 && (
                          <span className="block text-xs text-text-3">
                            うち承認済み {r.approvedPoints}pt
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="mt-3">
                      <ProblemTiles sent={r.sent} highlight={r.approved.length ? r.added : []} />
                      {r.approved.length > 0 && (
                        <p className="mt-2 text-xs text-text-3">
                          黒い課題が今回追加された分です（灰色は承認済み）。
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-start gap-2">
                      <GymActionForm action={approveScores}>
                        <input type="hidden" name="only" value={r.id} />
                        <SubmitButton pendingText="承認中…">承認する</SubmitButton>
                      </GymActionForm>
                      <details className="group min-w-0 flex-1">
                        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full border border-line px-5 text-sm font-bold hover:border-gray-300 [&::-webkit-details-marker]:hidden">
                          差し戻す
                        </summary>
                        <GymActionForm action={rejectScore} className="mt-3">
                          <input type="hidden" name="id" value={r.id} />
                          <label htmlFor={`reason-${r.id}`} className="text-sm font-bold">
                            差し戻しの理由（選手に届きます）
                          </label>
                          <textarea
                            id={`reason-${r.id}`}
                            name="reason"
                            required
                            maxLength={200}
                            rows={2}
                            placeholder="例：No.32 の完登を確認できませんでした"
                            className="mt-2 block w-full rounded-xl border border-line bg-white px-4 py-3 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
                          />
                          <SubmitButton variant="danger" pendingText="送信中…" className="mt-2">
                            差し戻しを確定
                          </SubmitButton>
                        </GymActionForm>
                      </details>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function GymPendingPage(props: PageProps<"/gym-admin">) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">承認待ち</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        選手のスコアを確認して承認してください。承認すると、すぐにランキングへ反映されます。
        承認したら、参加賞ステッカーをお渡しください（先着・1人1枚）。
      </p>
      <Suspense fallback={<ListSkeleton />}>
        <PendingList searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
