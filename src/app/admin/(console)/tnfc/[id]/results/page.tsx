import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import { isFinalsRound } from "@/domain/tnfc-finals";
import { categorySummary, finalistsNewsText } from "@/domain/tnfc-results";
import { shortDate } from "@/features/mypage/components/MySection";
import { Block, PageSkeleton } from "@/features/tnfc/components/Parts";
import { ResultImportForm } from "@/features/tnfc/components/ResultImportForm";
import { CopyButton } from "@/features/tnfc/components/TnfcForms";
import { getRound, getRoundResults } from "@/features/tnfc/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC リザルト" };

const downloadClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-5 text-sm font-bold hover:border-gray-300";

// Office work after a qualifier (workflow diagram B-5): result import with finalists and Ranking
// points, the result CSV for the old site, the member CSV for the finals sheet, NEWS text.

async function Results({ params }: { params: PageProps<"/admin/tnfc/[id]/results">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const [round, results] = await Promise.all([getRound(id), getRoundResults(id)]);
  if (!round) notFound();
  const imported = results.length > 0;
  const summary = categorySummary(results);
  const finalists = results.filter((r) => r.qualified);
  const finals = isFinalsRound(round);

  return (
    <div className="space-y-8">
      <Block
        title={finals ? "本戦リザルトの取り込み（1.4）" : "リザルトの取り込み（1.2.1）"}
        description={
          finals
            ? "TNFC Control で確定した本戦のリザルトを読み込み、Ranking の公認大会ポイントを付けます。Division 昇格は「本戦」のページで行います。"
            : "TNFC Control で確定したリザルト（順位・ID・氏名・カテゴリー）を読み込み、本戦出場者を決めて Ranking の公認大会ポイントを付けます。取り込み直すと、この大会の結果とポイントは置き換わります。"
        }
      >
        {imported && (
          <p className="mb-4 text-sm text-text-2">
            確定済み：{results.length}人{!finals && `・本戦 ${finalists.length}人`}（
            {shortDate(round.resultsImportedAt)}
            {!finals && `、通過ライン 上位${round.finalsCutoff}位`}）
          </p>
        )}
        <ResultImportForm
          roundId={round.id}
          defaultCutoff={round.finalsCutoff}
          defaultCutoffs={round.finalsCutoffByCategory}
          imported={imported}
          finals={finals}
        />
      </Block>

      {imported && (
        <>
          <Block
            title="出力とお知らせ（1.2.1・1.2.2）"
            description="NEWS の画面ができるまでは、お知らせ文をコピーして投稿してください。"
          >
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/admin/tnfc/${round.id}/csv?type=results`}
                download
                className={downloadClass}
              >
                <Download className="size-4" aria-hidden />
                HP アップロード用リザルト
              </a>
              <a
                href={`/api/admin/tnfc/${round.id}/csv?type=members`}
                download
                className={downloadClass}
              >
                <Download className="size-4" aria-hidden />
                全会員（会員シート用）
              </a>
              {!finals && (
                <CopyButton
                  text={finalistsNewsText(round, results)}
                  label="本戦出場者のお知らせ文をコピー"
                />
              )}
            </div>
          </Block>

          <section>
            <h2 className="text-lg font-bold">確定したリザルト</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {summary.map((c) => (
                <li
                  key={c.division}
                  className="rounded-full border border-line bg-white px-3 py-1 text-sm"
                >
                  {divisionName(c.division)}
                  <span className="ml-1.5 text-text-3 tabular-nums">
                    {c.count}人・本戦{c.qualified}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white px-5 py-2 md:px-6">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-text-3">
                  <tr>
                    <th className="py-2 pr-3 font-bold">カテゴリー</th>
                    <th className="py-2 pr-3 text-right font-bold">順位</th>
                    <th className="py-2 pr-3 font-bold">氏名</th>
                    <th className="py-2 pr-3 font-bold">ID</th>
                    <th className="py-2 pr-3 font-bold">本戦</th>
                    <th className="py-2 text-right font-bold">付与pt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {results.map((r) => (
                    <tr key={r.userId}>
                      <td className="py-2 pr-3">{divisionName(r.division)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.rank}</td>
                      <td className="py-2 pr-3">{r.name}</td>
                      <td className="py-2 pr-3 text-text-3 tabular-nums">{r.userId}</td>
                      <td className="py-2 pr-3">
                        {r.declined ? (
                          <span className="text-text-3">辞退</span>
                        ) : r.qualified ? (
                          <b>出場</b>
                        ) : (
                          ""
                        )}
                      </td>
                      <td className="py-2 text-right tabular-nums">{r.points.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default function RoundResultsPage(props: PageProps<"/admin/tnfc/[id]/results">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Results params={props.params} />
    </Suspense>
  );
}
