import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlertTriangle, Download } from "lucide-react";
import { Suspense } from "react";
import { isActiveEntry, planSessionGroups } from "@/domain/tnfc";
import { shortDate } from "@/features/mypage/components/MySection";
import { RoundActionButton } from "@/features/tnfc/components/TnfcForms";
import { Block, EntryTable, PageSkeleton } from "@/features/tnfc/components/Parts";
import { getRound, getRoundEntries } from "@/features/tnfc/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC ゼッケン・CSV" };

const downloadClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-5 text-sm font-bold hover:border-gray-300";

async function Bibs({ params }: { params: PageProps<"/admin/tnfc/[id]/bibs">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const [round, entries] = await Promise.all([getRound(id), getRoundEntries(id)]);
  if (!round) notFound();
  const active = entries
    .filter(isActiveEntry)
    .sort((a, b) => (a.bibNo ?? Infinity) - (b.bibNo ?? Infinity));
  const missing = active.filter((e) => e.bibNo == null).length;
  const numbered = round.lastBibNo != null;
  const groups = planSessionGroups(active, round.areaCount);

  return (
    <div className="space-y-8">
      <Block
        title="ゼッケン採番とグループ分け（1.1.1・1.1.3）"
        description={`キャンセルを除いた全員に、No.${round.previousFinalBibNo + 1} から通し番号を付けます（カテゴリー→ふりがな順）。グループは1エリア約5人で組みます。`}
      >
        {numbered && (
          <p className="mb-4 text-sm text-text-2">
            採番済み：No.{round.previousFinalBibNo + 1}〜{round.lastBibNo}（
            {shortDate(round.numberedAt)}）
          </p>
        )}
        {numbered && missing > 0 && (
          <p className="mb-4 flex items-start gap-2 rounded-xl border border-status-pending/40 bg-status-pending/10 p-3 text-sm text-[#a16207]">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            ゼッケンのない人が{missing}人います。採番をやり直してください。
          </p>
        )}
        <RoundActionButton
          kind="number"
          roundId={round.id}
          label={numbered ? "採番をやり直す" : "ゼッケンを採番する"}
          variant={numbered ? "secondary" : "primary"}
          confirmText={
            numbered
              ? "ゼッケンとグループを付け直します。TNFC Control や受付表に出したあとなら、出し直しが必要です。よろしいですか？"
              : undefined
          }
        />
      </Block>

      {groups.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">グループ</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.name} className="rounded-2xl border border-line bg-white p-4">
                <p className="flex items-center justify-between gap-3">
                  <span className="font-display font-bold">{g.name}</span>
                  <span className="text-sm tabular-nums">
                    {g.count}人 ・ 1エリア {g.perArea}人
                  </span>
                </p>
                <p className="mt-1 text-sm text-text-2">{g.categories.join("・")}</p>
                {g.firstBib != null && (
                  <p className="mt-1 text-xs text-text-3 tabular-nums">
                    No.{g.firstBib}〜{g.lastBib}
                  </p>
                )}
                {g.needsMoreTime && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-[#a16207]">
                    <AlertTriangle className="size-4" aria-hidden />
                    1エリア6人以上：時間の延長を検討
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Block
        title="CSV 出力（1.1.1・1.1.2）"
        description="TNFC Control 用は、男子のカテゴリーを「Division 3」の形にしています（TNFC Control の詳細 → 選手 → アップロード）。"
      >
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/admin/tnfc/${round.id}/csv?type=reception`}
            download
            className={downloadClass}
          >
            <Download className="size-4" aria-hidden />
            受付表
          </a>
          <a
            href={`/api/admin/tnfc/${round.id}/csv?type=control`}
            download
            className={downloadClass}
          >
            <Download className="size-4" aria-hidden />
            TNFC Control 用
          </a>
        </div>
        {!numbered && (
          <p className="mt-3 text-sm text-text-3">ゼッケンを採番してから出力してください。</p>
        )}
      </Block>

      <section>
        <h2 className="text-lg font-bold">ゼッケン順の一覧</h2>
        <div className="mt-3 rounded-2xl border border-line bg-white px-5 py-2 md:px-6">
          <EntryTable entries={active} showGroup />
        </div>
      </section>
    </div>
  );
}

export default function RoundBibsPage(props: PageProps<"/admin/tnfc/[id]/bibs">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Bibs params={props.params} />
    </Suspense>
  );
}
