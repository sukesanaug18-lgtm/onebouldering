import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { TopGroup } from "@/domain/home";
import { cn } from "@/lib/cn";

/**
 * National top 3 (CLAUDE.md 5-5). Without groups it shows placeholders (loading);
 * with none it says the season has no scores yet.
 */
export function RankingTop({ groups }: { groups?: TopGroup[] }) {
  return (
    <Section tone="subtle" aria-labelledby="ranking-title">
      <SectionHeading
        id="ranking-title"
        eyebrow="Ranking"
        title="全国ランキング トップ3"
        action={
          <Button href="/ranking" variant="text">
            ランキングを見る
          </Button>
        }
      />
      {groups && groups.length === 0 && (
        <p className="mt-10 text-sm text-text-2">
          今シーズンのスコアはまだありません。集計が始まると、ここに上位の選手が表示されます。
        </p>
      )}
      <div className="mt-10 grid gap-4 md:grid-cols-2" aria-busy={!groups}>
        {!groups &&
          [0, 1].map((i) => (
            <Card key={i} accent="ranking" padding="lg">
              <div className="h-5 w-32 animate-pulse rounded bg-line" />
              <div className="mt-6 space-y-5">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="h-9 animate-pulse rounded bg-line" />
                ))}
              </div>
            </Card>
          ))}
        {groups?.map((group, gi) => (
          <FadeIn key={group.label} delay={gi * 0.06}>
            <Card accent="ranking" padding="lg">
              <h3 className="font-bold">{group.label}</h3>
              <ol className="mt-4 divide-y divide-line">
                {group.rows.map((row) => (
                  <li key={row.rank} className="flex items-center gap-4 py-4">
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold tabular-nums",
                        row.rank === 1
                          ? "bg-event-ranking text-text"
                          : "border border-line text-text-2",
                      )}
                    >
                      <span className="sr-only">第</span>
                      {row.rank}
                      <span className="sr-only">位</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{row.name}</p>
                      <p className="truncate text-sm text-text-3">{row.gym}</p>
                    </div>
                    <p className="font-display text-lg font-bold tabular-nums">
                      {row.points.toLocaleString("ja-JP")}
                      <span className="ml-1 text-xs font-medium text-text-3">pt</span>
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}
