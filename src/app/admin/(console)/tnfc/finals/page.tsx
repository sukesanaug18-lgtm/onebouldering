import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import { aggregateFinalists, finalsNewsText, finalsPromotions } from "@/domain/tnfc-finals";
import { shortDate } from "@/features/mypage/components/MySection";
import {
  CreateFinalsForm,
  DeclinePanel,
  FinalsActionButton,
} from "@/features/tnfc/components/OpsForms";
import { Block, PageSkeleton } from "@/features/tnfc/components/Parts";
import { CopyButton } from "@/features/tnfc/components/TnfcForms";
import {
  getFinalsRound,
  getMembers,
  getRoundEntries,
  getRoundResults,
  getSeasonQualifierResults,
  listRounds,
} from "@/features/tnfc/queries";
import { listAdminVenues } from "@/features/venue/queries";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC 本戦" };

// Before and after the finals (workflow diagram B-6, 1.3–1.4): the finalists of every qualifier,
// declines with the next player moving up, the finals round and its entries, and promotions.

async function Finals({ top }: { top: number }) {
  await requireAdmin();
  const season = CURRENT_SEASON_ID;
  const [results, finals, rounds, venues] = await Promise.all([
    getSeasonQualifierResults(season),
    getFinalsRound(season),
    listRounds(season),
    listAdminVenues(),
  ]);
  const { finalists, declined } = aggregateFinalists(results);
  const [finalsEntries, finalsResults] = finals
    ? await Promise.all([getRoundEntries(finals.id), getRoundResults(finals.id)])
    : [[], []];
  const members = await getMembers(finalsResults.map((r) => r.userId));
  const promotions = finalsPromotions(
    finalsResults,
    new Map([...members].map(([k, m]) => [k, m.division])),
    top,
  );
  const entryCount = finalsEntries.filter((e) => e.status !== "cancelled").length;
  const label = (r: {
    name: string;
    userId: string;
    division: string;
    venueName: string;
    rank: number;
  }) => `${r.name}（${r.userId}・${divisionName(r.division)}・${r.venueName} ${r.rank}位）`;

  return (
    <div className="space-y-8">
      <Block
        title={`本戦出場者（1.3）　${finalists.length}人`}
        description="各予選で確定したリザルトから集めています。同じ人が2つの予選で出場権を取った場合は、早いラウンドで数えます。"
      >
        {finalists.length === 0 ? (
          <p className="text-sm text-text-3">
            まだいません。予選の「リザルト（予選後）」で確定してください。
          </p>
        ) : (
          <div className="-mx-5 overflow-x-auto md:-mx-6">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="text-left text-xs text-text-3">
                <tr className="border-b border-line">
                  <th className="py-2 pl-5 font-medium md:pl-6">カテゴリー</th>
                  <th className="py-2 font-medium">氏名・ID</th>
                  <th className="py-2 font-medium">予選</th>
                  <th className="py-2 pr-5 font-medium md:pr-6">辞退したときの次点</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {finalists.map((f) => (
                  <tr key={f.id}>
                    <td className="py-2.5 pl-5 whitespace-nowrap md:pl-6">
                      {divisionName(f.division)}
                    </td>
                    <td className="py-2.5">
                      <span className="font-bold">{f.name}</span>
                      <span className="ml-2 text-xs text-text-3 tabular-nums">No.{f.userId}</span>
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      ROUND{f.roundNumber} {f.venueName} {f.rank}位
                    </td>
                    <td className="py-2.5 pr-5 text-text-2 md:pr-6">
                      {f.next ? `${f.next.name}（${f.next.rank}位）` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {declined.length > 0 && (
          <p className="mt-4 text-sm text-text-2">
            辞退：{declined.map((d) => `${d.name}（${divisionName(d.division)}）`).join("、")}
          </p>
        )}
      </Block>

      {finalists.length > 0 && (
        <Block
          title="本戦辞退の受付（1.3）"
          description="辞退を記録するとキャンセル台帳に入ります。次点を繰り上げると、その人に通知が届きます。"
        >
          <DeclinePanel
            finalists={finalists.map((f) => ({
              id: f.id,
              label: label(f),
              next: f.next ? { id: f.next.id, label: label(f.next) } : null,
            }))}
          />
        </Block>
      )}

      <Block
        title="本戦の大会"
        description="本戦は1シーズンに1つです。作ったあとは、予選と同じ画面でゼッケン・CSV・リザルトを扱えます。"
      >
        {!finals ? (
          <CreateFinalsForm
            venues={venues.map((v) => ({ id: v.id, name: v.name }))}
            previousFinalBibNo={Math.max(0, ...rounds.map((r) => r.lastBibNo ?? 0))}
          />
        ) : (
          <div className="space-y-5">
            <Link
              href={`/admin/tnfc/${finals.id}`}
              className="flex min-h-14 items-center gap-3 rounded-xl border border-line px-4 py-3 hover:bg-bg-subtle/60"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{finals.venueName}</span>
                <span className="block text-xs text-text-3">
                  {finals.eventDate ? finals.eventDate.replaceAll("-", "/") : "日程未定"} ・
                  エントリー {entryCount}人
                  {finals.lastBibNo != null &&
                    ` ・ No.${finals.previousFinalBibNo + 1}〜${finals.lastBibNo}`}
                </span>
              </span>
              <ChevronRight className="size-4 text-text-3" aria-hidden />
            </Link>
            <FinalsActionButton
              kind="entries"
              roundId={finals.id}
              label={entryCount > 0 ? "本戦エントリーを作り直す" : "本戦エントリーを作る"}
              confirmText={`本戦出場者 ${finalists.length}人のエントリーを作り、ゼッケンとグループを付けます。${entryCount > 0 ? "今のゼッケンは付け直しになります。" : ""}よろしいですか？`}
            />
          </div>
        )}
      </Block>

      {finals && (
        <Block
          title="本戦後：Division 昇格（1.4）"
          description="本戦のリザルトは、本戦の大会の「リザルト」タブで取り込みます。各カテゴリーの上位の人の Division を1つ上げます（Men‘s Division 1・Women‘s Division 1 と U カテゴリーはそのまま）。"
        >
          {finalsResults.length === 0 ? (
            <p className="text-sm text-text-3">本戦のリザルトをまだ取り込んでいません。</p>
          ) : (
            <div className="space-y-4">
              <form className="flex flex-wrap items-end gap-3" action="/admin/tnfc/finals">
                <label className="text-sm font-bold">
                  昇格する順位
                  <span className="mt-2 flex items-center gap-2 font-normal">
                    上位
                    <input
                      name="top"
                      defaultValue={top}
                      inputMode="numeric"
                      className="block w-20 rounded-xl border border-line bg-white px-3 py-2 text-right tabular-nums"
                    />
                    位まで
                  </span>
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-bold hover:border-gray-300"
                >
                  対象者を表示
                </button>
              </form>
              {finals.promotionsAppliedAt && (
                <p className="text-sm text-text-2">
                  反映済み（{shortDate(finals.promotionsAppliedAt)}）
                </p>
              )}
              {promotions.length === 0 ? (
                <p className="text-sm text-text-3">
                  昇格する人はいません（反映済みの人は出ません）。
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {promotions.map((p) => (
                    <li key={p.userId} className="flex flex-wrap gap-x-3 px-4 py-2.5 text-sm">
                      <span className="font-bold">{p.name}</span>
                      <span className="text-text-3 tabular-nums">
                        No.{p.userId}・{p.rank}位
                      </span>
                      <span>
                        {divisionName(p.from)} → <b>{divisionName(p.to)}</b>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-start gap-3">
                <FinalsActionButton
                  kind="promotions"
                  roundId={finals.id}
                  cutoff={top}
                  disabled={promotions.length === 0}
                  label={
                    promotions.length > 0
                      ? `${promotions.length}人の Division を上げる`
                      : "昇格する人はいません"
                  }
                  confirmText={`${promotions.length}人の Division を1つ上げ、本人に通知します。よろしいですか？`}
                />
                <CopyButton
                  text={finalsNewsText(finals, finalsResults, promotions)}
                  label="本戦結果のお知らせ文をコピー"
                />
              </div>
            </div>
          )}
        </Block>
      )}
    </div>
  );
}

export default function FinalsPage({ searchParams }: PageProps<"/admin/tnfc/finals">) {
  return (
    <>
      <Link
        href="/admin/tnfc"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        予選一覧へ
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">本戦</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        THE NORTH FACE CUP {seasonLabel(CURRENT_SEASON_ID)} の本戦前・本戦後の事務。
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <FinalsTop searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function FinalsTop({
  searchParams,
}: {
  searchParams: PageProps<"/admin/tnfc/finals">["searchParams"];
}) {
  const raw = (await searchParams).top;
  const n = Math.floor(Number(Array.isArray(raw) ? raw[0] : raw));
  return <Finals top={Number.isFinite(n) && n >= 1 && n <= 50 ? n : 3} />;
}
