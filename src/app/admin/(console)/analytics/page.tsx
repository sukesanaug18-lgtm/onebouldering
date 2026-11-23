import type { Metadata } from "next";
import { Download } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { divisionName } from "@/domain/division";
import { BarCell, BarChart, Stat } from "@/features/analytics/components/Charts";
import { getSeasonAnalytics } from "@/features/analytics/queries";
import { PageSkeleton } from "@/features/tnfc/components/Parts";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "分析" };

// Season analytics from Firestore: participation by gym and Division, problem send rates and
// when scores are sent. Page views (GA4) are looked at in Google Analytics itself.

const pct = (r: number) => `${Math.round(r * 1000) / 10}%`;

function Panel({
  title,
  description,
  csv,
  children,
}: {
  title: string;
  description?: string;
  csv?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-white p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          {description && <p className="mt-1 text-sm text-text-2">{description}</p>}
        </div>
        {csv && (
          <a
            href={`/api/admin/analytics?type=${csv}`}
            download
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-bold hover:border-gray-300"
          >
            <Download className="size-4" aria-hidden />
            CSV
          </a>
        )}
      </div>
      {children}
    </section>
  );
}

async function Analytics() {
  await requireAdmin();
  const a = await getSeasonAnalytics(CURRENT_SEASON_ID);
  const maxPlayers = Math.max(0, ...a.venues.map((v) => v.players));
  const month = (m: string) => `${Number(m.slice(5))}月`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="会員"
          value={a.members.toLocaleString()}
          note={`今季の新規 ${a.newMembers}人`}
        />
        <Stat
          label="Ranking 参加者"
          value={a.activePlayers.toLocaleString()}
          note="今季1回以上提出"
        />
        <Stat
          label="提出（ジム×選手）"
          value={a.sheets.toLocaleString()}
          note={`承認待ち ${a.pending}`}
        />
        <Stat label="1人あたりのジム数" value={a.gymsPerPlayer.toFixed(2)} note="参加者の平均" />
        <Stat label="Tryout 受験" value={a.tryouts.toLocaleString()} />
        <Stat label="会場（提出あり）" value={a.venues.length.toLocaleString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="月別の提出数" description="スコアを最後に送った月で数えています。">
          <BarChart
            label="月別の提出数"
            bars={a.months.map((m) => ({
              label: month(m.month),
              value: m.sheets,
              tip: `${month(m.month)}：${m.sheets}件`,
            }))}
          />
        </Panel>
        <Panel title="月別の新規会員">
          <BarChart
            label="月別の新規会員"
            bars={a.months.map((m) => ({
              label: month(m.month),
              value: m.members,
              tip: `${month(m.month)}：${m.members}人`,
            }))}
          />
        </Panel>
      </div>

      <Panel
        title="課題ごとの完登率"
        description={`今季の提出 ${a.problems.total}件のうち、その課題を完登した割合（差し戻しは除く）。`}
        csv="problems"
      >
        <BarChart
          label="課題ごとの完登率"
          every={5}
          format={pct}
          bars={a.problems.rates.map((r) => ({
            label: String(r.no),
            value: r.rate,
            tip: `No.${r.no}：${pct(r.rate)}（${r.sent}人）`,
          }))}
        />
      </Panel>

      <Panel title="提出の時間帯" description="日本時間。最後に送った時刻で数えています。">
        <BarChart
          label="提出の時間帯"
          every={3}
          bars={a.hours.map((n, h) => ({ label: `${h}時`, value: n, tip: `${h}時台：${n}件` }))}
        />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <Panel title="会場別" description="参加人数の多い順。" csv="venues">
          <div className="-mx-5 overflow-x-auto md:-mx-6">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-text-3">
                <tr className="border-b border-line">
                  <th className="py-2 pl-5 font-medium md:pl-6">会場</th>
                  <th className="py-2 font-medium">参加人数</th>
                  <th className="py-2 text-right font-medium">承認待ち</th>
                  <th className="py-2 pr-5 text-right font-medium md:pr-6">平均pt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.venues.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 pl-5 md:pl-6">
                      <span className="font-bold">{v.name}</span>
                      <span className="ml-2 text-xs text-text-3">{v.region}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <BarCell value={v.players} max={maxPlayers}>
                        {v.players}
                      </BarCell>
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{v.pending || "—"}</td>
                    <td className="py-2.5 pr-5 text-right tabular-nums md:pr-6">{v.avgPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel
          title="Division 別"
          description="登録人数と、今季1回以上提出した人の割合。"
          csv="divisions"
        >
          <div className="-mx-5 overflow-x-auto md:-mx-6">
            <table className="w-full min-w-[380px] text-sm">
              <thead className="text-left text-xs text-text-3">
                <tr className="border-b border-line">
                  <th className="py-2 pl-5 font-medium md:pl-6">Division</th>
                  <th className="py-2 text-right font-medium">登録</th>
                  <th className="py-2 pr-5 pl-4 font-medium md:pr-6">参加率</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.divisions.map((d) => (
                  <tr key={d.division}>
                    <td className="py-2.5 pl-5 md:pl-6">{divisionName(d.division)}</td>
                    <td className="py-2.5 text-right tabular-nums">{d.registered}</td>
                    <td className="py-2.5 pr-5 pl-4 md:pr-6">
                      <BarCell value={d.rate} max={1}>
                        {pct(d.rate)}
                      </BarCell>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <p className="text-sm text-text-3">
        ページの閲覧数・流入元などのアクセス解析は Google Analytics（GA4）の管理画面で確認します。
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">分析</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        Season {seasonLabel(CURRENT_SEASON_ID)} の参加状況。
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Analytics />
      </Suspense>
    </>
  );
}
