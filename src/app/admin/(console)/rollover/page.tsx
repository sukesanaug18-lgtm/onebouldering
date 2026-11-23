import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import {
  computeRollover,
  RESET_DIVISIONS,
  ROLLOVER_REASON,
  type RolloverReason,
} from "@/domain/rollover";
import { RolloverButton } from "@/features/rollover/components/RolloverButton";
import { getRolloverMembers, getRolloverRecord } from "@/features/rollover/queries";
import { Block, PageSkeleton } from "@/features/tnfc/components/Parts";
import { getFinalsRound } from "@/features/tnfc/queries";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "年度更新" };

// Year-end reset and U category moves (workflow diagram B-7, 1.5.1–1.5.2): preview every
// change, then apply them in one go.

const jst = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  });

async function Rollover() {
  await requireAdmin();
  const nextSeasonId = String(Number(CURRENT_SEASON_ID) + 1);
  const [members, record, finals] = await Promise.all([
    getRolloverMembers(),
    getRolloverRecord(nextSeasonId),
    getFinalsRound(CURRENT_SEASON_ID),
  ]);
  const { changes, missingBirthDate } = computeRollover(members, nextSeasonId);
  const reasons = Object.keys(ROLLOVER_REASON) as RolloverReason[];
  const done = Boolean(record?.completedAt);
  const finalsPending = finals && finals.resultCount > 0 && !finals.promotionsAppliedAt;

  return (
    <div className="space-y-8">
      {done ? (
        <p className="rounded-2xl border border-line bg-white p-5 text-sm">
          <span className="font-bold">
            {seasonLabel(nextSeasonId)} シーズンへの年度更新は済んでいます
          </span>
          （{jst(record!.completedAt)}・{record!.changed}人）。もう一度は実行できません。
        </p>
      ) : (
        <ol className="list-decimal space-y-1 rounded-2xl border border-line bg-white p-5 pl-10 text-sm text-text-2">
          <li>
            TNFC 本戦の Division
            昇格を先に反映してください（昇格した人はリセットの対象から外れます）。
          </li>
          <li>下の一覧と「生年月日の確認が必要な人」を確認します。</li>
          <li>「カテゴリーを更新する」を押すと、全員分を一度に変更し、本人に通知します。</li>
        </ol>
      )}
      {!done && finalsPending && (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm">
          <span className="font-bold">本戦の昇格がまだです。</span>
          <Link href="/admin/tnfc/finals" className="ml-2 font-bold underline underline-offset-2">
            TNFC 本戦ページへ
          </Link>
        </p>
      )}

      {!done && (
        <Block
          title={`変わる人　${changes.length}人`}
          description={`Division リセットの対象：${RESET_DIVISIONS.map(divisionName).join("・")} → 未確定（Tryout を受け直し）。U カテゴリーは ${Number(nextSeasonId)}年4月1日時点の年齢で決め直し、16歳になる人は未確定にします。`}
        >
          <ul className="mb-4 flex flex-wrap gap-2 text-sm">
            {reasons.map((r) => (
              <li
                key={r}
                className="rounded-full border border-line bg-white px-4 py-1.5 tabular-nums"
              >
                {ROLLOVER_REASON[r]} {changes.filter((c) => c.reason === r).length}人
              </li>
            ))}
          </ul>
          {changes.length === 0 ? (
            <p className="text-sm text-text-3">変わる人はいません。</p>
          ) : (
            <div className="-mx-5 overflow-x-auto md:-mx-6">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs text-text-3">
                  <tr className="border-b border-line">
                    <th className="py-2 pl-5 font-medium md:pl-6">理由</th>
                    <th className="py-2 font-medium">氏名・ID</th>
                    <th className="py-2 pr-5 font-medium md:pr-6">変更</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {changes.map((c) => (
                    <tr key={c.userId}>
                      <td className="py-2.5 pl-5 whitespace-nowrap text-text-2 md:pl-6">
                        {ROLLOVER_REASON[c.reason]}
                      </td>
                      <td className="py-2.5">
                        <Link
                          href={`/admin/members/${c.userId}`}
                          className="font-bold hover:underline"
                        >
                          {c.name || "（名前なし）"}
                        </Link>
                        <span className="ml-2 text-xs text-text-3 tabular-nums">No.{c.userId}</span>
                      </td>
                      <td className="py-2.5 pr-5 whitespace-nowrap md:pr-6">
                        {divisionName(c.from)} →{" "}
                        <span className="font-bold">{divisionName(c.to)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Block>
      )}

      <Block
        title={`生年月日の確認が必要な人　${missingBirthDate.length}人`}
        description="U カテゴリーなのに生年月日がない・正しくない人です。カテゴリーは変わりません。会員ページで生年月日を入れてから、この画面を開き直してください。"
      >
        {missingBirthDate.length === 0 ? (
          <p className="text-sm text-text-3">いません。</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {missingBirthDate.map((m) => (
              <li key={m.id} className="py-2.5">
                <Link href={`/admin/members/${m.id}`} className="font-bold hover:underline">
                  {m.name || "（名前なし）"}
                </Link>
                <span className="ml-2 text-xs text-text-3 tabular-nums">No.{m.id}</span>
                <span className="ml-2 text-text-2">{divisionName(m.division)}</span>
                <span className="ml-2 text-xs text-text-3">{m.birthDate || "生年月日なし"}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="実行">
        <RolloverButton
          nextSeasonId={nextSeasonId}
          count={changes.length}
          done={done}
          disabled={done || changes.length === 0}
          confirmText={`${changes.length}人のカテゴリーを変更し、本人に通知します。元に戻す操作はありません。よろしいですか？`}
        />
      </Block>
    </div>
  );
}

export default function RolloverPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">年度更新（年度末リセット・U 進級）</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        Season {seasonLabel(CURRENT_SEASON_ID)} →{" "}
        {seasonLabel(String(Number(CURRENT_SEASON_ID) + 1))}{" "}
        の切り替えで、選手のカテゴリーをまとめて変えます。シーズン終了後（3月）に1回だけ実行します。
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Rollover />
      </Suspense>
    </>
  );
}
