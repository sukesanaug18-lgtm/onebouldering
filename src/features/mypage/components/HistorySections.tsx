import { Button } from "@/components/ui/Button";
import { divisionName } from "@/domain/division";
import { JUDGMENT_LABEL } from "@/domain/tryout";
import { cn } from "@/lib/cn";
import { getMyCompetitions, getMyTnfc, getMyTryouts } from "../queries";
import { MySection, shortDate } from "./MySection";

const label = divisionName;

/** Every Tryout the player took, newest first. */
export async function TryoutHistory({ userId }: { userId: string }) {
  const list = await getMyTryouts(userId);
  return (
    <MySection
      title="Division Tryout の履歴"
      accent="tryout"
      empty={list.length === 0 && "まだ Tryout を受けていません。"}
    >
      <ul className="divide-y divide-line">
        {list.map((t) => (
          <li key={t.id} className="py-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-text-3 tabular-nums">{shortDate(t.at)}</span>
              <span className="font-bold whitespace-nowrap">
                {JUDGMENT_LABEL[t.judgment] ?? t.judgment}
                <span className="ml-2 font-display">
                  {label(t.oldDivision)} → {label(t.newDivision)}
                </span>
              </span>
            </div>
            <p className="mt-1 text-sm text-text-2">
              {t.venueName} ・ {label(t.challenged)} に挑戦 ・ {t.completedCount}/6 完登
            </p>
          </li>
        ))}
      </ul>
    </MySection>
  );
}

const TNFC_STATUS = {
  paid: { text: "入金確認済み", className: "text-[#047857] bg-status-approved/10" },
  unpaid: { text: "未入金・確認中", className: "text-[#a16207] bg-status-pending/10" },
  cancelled: { text: "キャンセル", className: "text-[#b91c1c] bg-status-rejected/10" },
} as const;

/** This season's TNFC entries with bib number, payment and result. */
export async function TnfcEntries({ userId, seasonId }: { userId: string; seasonId: string }) {
  const list = await getMyTnfc(userId, seasonId);
  return (
    <MySection
      title="THE NORTH FACE CUP"
      accent="tnfc"
      action={
        <Button href="/tnfc" variant="text" className="text-sm">
          予選の日程
        </Button>
      }
      empty={list.length === 0 && "今年度のエントリーはありません。"}
    >
      <ul className="space-y-3">
        {list.map((e) => (
          <li key={e.id} className="rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">
                {e.roundName}
                {e.venueName && `（${e.venueName}）`}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  TNFC_STATUS[e.status].className,
                )}
              >
                {TNFC_STATUS[e.status].text}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-2">
              出場Division：<span className="font-bold">{label(e.division)}</span>
              {e.bibNo && ` ・ ゼッケン ${e.bibNo}`}
              {e.sessionGroup && ` ・ ${e.sessionGroup}`}
            </p>
            {e.result && (
              <p className="mt-2 text-sm">
                結果：<span className="font-bold">{e.result.rank}位</span>
                {e.result.qualified && (
                  <span className="ml-2 rounded-full bg-text px-2 py-0.5 text-xs font-bold text-white">
                    本戦出場権
                  </span>
                )}
                <span className="ml-2 text-text-2">
                  Ranking +{e.result.points.toLocaleString()}pt
                </span>
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-text-3">
        キャンセル・会場の変更は、ライセンスNo.と氏名を添えて事務局へご連絡ください。
      </p>
    </MySection>
  );
}

/** Official competition points counted in the overall ranking. */
export async function Competitions({ userId, seasonId }: { userId: string; seasonId: string }) {
  const list = await getMyCompetitions(userId, seasonId);
  return (
    <MySection title="公認大会の成績" empty={list.length === 0 && "今年度の成績はありません。"}>
      <ul className="divide-y divide-line">
        {list.map((c) => (
          <li key={c.id} className="flex items-center gap-4 py-3">
            <span className="flex-1">
              <span className="font-bold">{c.name}</span>
              {c.rank && <span className="ml-2 text-sm text-text-2">{c.rank}位</span>}
              {c.reset && <span className="block text-xs text-text-3">昇格によりリセット済み</span>}
            </span>
            <span
              className={cn(
                "font-display font-extrabold tabular-nums",
                c.reset && "text-text-3 line-through",
              )}
            >
              {c.points.toLocaleString()}
              <span className="ml-0.5 text-xs">pt</span>
            </span>
          </li>
        ))}
      </ul>
    </MySection>
  );
}
