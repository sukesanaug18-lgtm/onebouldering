import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { divisionName } from "@/domain/division";
import { JUDGMENT_LABEL } from "@/domain/tryout";
import { MemberForm } from "@/features/member/components/MemberForm";
import { TempPinCard } from "@/features/member/components/TempPinCard";
import { getMember } from "@/features/member/queries";
import { shortDate } from "@/features/mypage/components/MySection";
import { getMyGymScores, getMyTnfc, getMyTryouts } from "@/features/mypage/queries";
import { getVenues } from "@/features/ranking/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "会員の詳細" };

const label = divisionName;
const STATUS: Record<string, string> = {
  Approved: "承認済み",
  Pending: "承認待ち",
  Rejected: "差し戻し",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <Card className="bg-white">{children}</Card>
    </section>
  );
}

/** Ranking scores, Tryouts and TNFC entries this season (read only). */
async function History({ id }: { id: string }) {
  const season = CURRENT_SEASON_ID;
  const [scores, tryouts, tnfc, venues] = await Promise.all([
    getMyGymScores(id, season),
    getMyTryouts(id),
    getMyTnfc(id, season),
    getVenues(),
  ]);
  const venueName = new Map(venues.map((v) => [v.id, v.name]));
  const empty = <p className="text-sm text-text-3">ありません。</p>;
  return (
    <div className="space-y-8">
      <Block title="Ranking スコア（今シーズン）">
        {scores.length === 0 ? (
          empty
        ) : (
          <ul className="divide-y divide-line">
            {scores.map((s) => (
              <li key={s.venueId} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate">{venueName.get(s.venueId) ?? s.venueId}</span>
                <span className="shrink-0 text-sm">
                  <span className="text-text-3">{s.status ? STATUS[s.status] : "—"}</span>
                  <span className="ml-3 font-display font-extrabold tabular-nums">
                    {s.points}pt
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="Division Tryout">
        {tryouts.length === 0 ? (
          empty
        ) : (
          <ul className="divide-y divide-line">
            {tryouts.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <span className="text-sm text-text-2">
                  <span className="tabular-nums">{shortDate(t.at)}</span> ・ {t.venueName} ・{" "}
                  {divisionName(t.challenged)} {t.completedCount}/6
                </span>
                <span className="text-sm font-bold whitespace-nowrap">
                  {JUDGMENT_LABEL[t.judgment] ?? t.judgment} {label(t.oldDivision)} →{" "}
                  {label(t.newDivision)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="TNFC エントリー（今シーズン）">
        {tnfc.length === 0 ? (
          empty
        ) : (
          <ul className="divide-y divide-line">
            {tnfc.map((e) => (
              <li key={e.id} className="py-2.5 text-sm">
                <span className="font-bold">{e.roundName}</span>
                <span className="ml-2 text-text-2">
                  {label(e.division)}
                  {e.bibNo && ` ・ ゼッケン ${e.bibNo}`} ・{" "}
                  {e.status === "paid"
                    ? "入金済み"
                    : e.status === "cancelled"
                      ? "キャンセル"
                      : "未入金"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </div>
  );
}

async function Detail({ params }: { params: PageProps<"/admin/members/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const m = await getMember(decodeURIComponent(id));
  if (!m) notFound();
  return (
    <div className="space-y-8">
      <div>
        <p className="font-display text-sm font-bold text-text-3 tabular-nums">No.{m.id}</p>
        <h1 className="text-2xl font-bold tracking-tight">{m.name || "（氏名なし）"}</h1>
        <p className="mt-1 text-sm text-text-2">
          <span className="font-display font-bold">{label(m.division)}</span>
          {m.createdAt && ` ・ 登録 ${shortDate(m.createdAt)}`}
          {m.updatedBy && ` ・ 最終更新 ${shortDate(m.updatedAt)}（${m.updatedBy}）`}
        </p>
      </div>
      <Block title="登録内容">
        <MemberForm member={m} />
      </Block>
      <Block title="暗証番号">
        <TempPinCard id={m.id} />
      </Block>
      <Suspense fallback={<div className="h-48 rounded-2xl bg-white" aria-busy="true" />}>
        <History id={m.id} />
      </Suspense>
    </div>
  );
}

export default function AdminMemberPage(props: PageProps<"/admin/members/[id]">) {
  return (
    <>
      <Link
        href="/admin/members"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        会員一覧へ
      </Link>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-white" aria-busy="true" />}>
        <Detail params={props.params} />
      </Suspense>
    </>
  );
}
