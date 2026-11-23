import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { divisionName, shortDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { myRankings, type MyRank } from "@/domain/ranking";
import type { ScoreStatus } from "@/domain/score";
import { getRanking, getVenues } from "@/features/ranking/queries";
import { cn } from "@/lib/cn";
import { getMyGymScores } from "../queries";
import { MySection } from "./MySection";

const STATUS: Record<ScoreStatus, { label: string; className: string }> = {
  Approved: { label: "承認済み", className: "text-[#047857] bg-status-approved/10" },
  Pending: { label: "承認待ち", className: "text-[#a16207] bg-status-pending/10" },
  Rejected: { label: "差し戻し", className: "text-[#b91c1c] bg-status-rejected/10" },
};

/** Ranking places (overall, regions) and the player's score at each gym this season. */
export async function MyRanking({
  userId,
  division,
  seasonId,
}: {
  userId: string;
  division: string;
  seasonId: string;
}) {
  if (division === UNDECIDED_DIVISION) {
    return (
      <MySection title="Ranking" accent="ranking">
        <p className="text-[15px] text-text-2">
          Divisionが決まると、Ranking にスコアを提出できます。まずは参加ジムで Division Tryout
          を受けてください。
        </p>
        <Button href="/tryout/about" variant="text" className="mt-3">
          Division Tryout について
        </Button>
      </MySection>
    );
  }

  const [ranking, venues, gyms] = await Promise.all([
    getRanking(seasonId),
    getVenues(),
    getMyGymScores(userId, seasonId),
  ]);
  const { overall, regions } = myRankings(ranking, userId, division);
  const venueName = new Map(venues.map((v) => [v.id, v.name]));
  const div = shortDivision(division);
  const name = divisionName(division);

  return (
    <MySection
      title="Ranking"
      accent="ranking"
      action={
        <Button href={`/ranking?div=${encodeURIComponent(div)}`} variant="text" className="text-sm">
          ランキングを見る
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Place label={`総合（${name}）`} rank={overall} />
        <div>
          <p className="text-sm text-text-3">地域別</p>
          {regions.length === 0 ? (
            <p className="mt-1 text-sm text-text-3">承認済みのスコアがあると表示されます。</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {regions.map((r) => (
                <li key={r.region} className="flex items-baseline justify-between gap-2">
                  <span className="font-bold">{r.region}</span>
                  <span className="tabular-nums">
                    <span className="font-display text-lg font-extrabold">{r.rank}</span>
                    <span className="text-sm text-text-3"> 位 / {r.total}名</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h3 className="mt-8 text-sm font-bold text-text-2">ジムごとのスコア</h3>
      {gyms.length === 0 ? (
        <p className="mt-2 text-sm text-text-3">
          まだ提出したスコアはありません。参加ジムの QR コードから提出できます。
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {gyms.map((g) => (
            <li key={g.venueId}>
              <Link
                href={`/score?venue=${encodeURIComponent(g.venueId)}`}
                className="flex min-h-14 items-center gap-3 py-2 hover:bg-bg-subtle/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{venueName.get(g.venueId) ?? g.venueId}</span>
                  {g.status === "Rejected" && g.rejectReason && (
                    <span className="block text-xs text-[#b91c1c]">理由：{g.rejectReason}</span>
                  )}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                  {g.status && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap",
                        STATUS[g.status].className,
                      )}
                    >
                      {STATUS[g.status].label}
                    </span>
                  )}
                  <span className="text-right font-display font-extrabold tabular-nums sm:w-20">
                    {g.points.toLocaleString()}
                    <span className="ml-0.5 text-xs">pt</span>
                  </span>
                </span>
                <ChevronRight className="size-4 text-text-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </MySection>
  );
}

function Place({ label, rank }: { label: string; rank: MyRank | null }) {
  return (
    <div>
      <p className="text-sm text-text-3">{label}</p>
      {rank ? (
        <>
          <p className="mt-1 tabular-nums">
            <span className="font-display text-4xl font-extrabold">{rank.rank}</span>
            <span className="text-text-3"> 位 / {rank.total}名</span>
          </p>
          <p className="text-sm text-text-2">{rank.score.toLocaleString()} pt</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-text-3">承認済みのスコアがあると表示されます。</p>
      )}
    </div>
  );
}
