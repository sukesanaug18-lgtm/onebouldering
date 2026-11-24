import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { UpcomingItem } from "@/domain/home";
import { cn } from "@/lib/cn";

const STATUS: Record<UpcomingItem["status"], { label: string; dot: string }> = {
  live: { label: "開催中", dot: "bg-status-approved" },
  open: { label: "受付中", dot: "bg-text" },
  soon: { label: "まもなく", dot: "bg-text-3" },
};

const SHORT_NAME = { tnfc: "TNFC", tryout: "Tryout", ranking: "Ranking" } as const;

/**
 * Now running / coming soon, all three events together (CLAUDE.md 5-4).
 * Without items it shows a placeholder list (loading) or the empty message.
 */
export function Upcoming({ items }: { items?: UpcomingItem[] }) {
  return (
    <Section aria-labelledby="upcoming-title">
      <SectionHeading
        id="upcoming-title"
        eyebrow="Now & Next"
        title="開催中・もうすぐ開催"
        action={
          <Button href="/schedule" variant="text">
            日程をすべて見る
          </Button>
        }
      />
      <FadeIn className="mt-10">
        <Card className="p-0">
          {!items ? (
            <ul className="divide-y divide-line" aria-busy>
              {[0, 1, 2].map((i) => (
                <li key={i} className="px-6 py-5 md:px-8">
                  <div className="h-4 w-20 animate-pulse rounded bg-line" />
                  <div className="mt-3 h-5 w-2/3 animate-pulse rounded bg-line" />
                </li>
              ))}
            </ul>
          ) : items.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-2 md:px-8">
              いま開催中・まもなく開催のイベントはありません。今後の予定は日程ページをご覧ください。
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-4 px-6 py-5 transition-colors duration-200 hover:bg-white focus-visible:bg-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-text md:px-8"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge event={item.event}>{SHORT_NAME[item.event]}</Badge>
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-text-2">
                          <span
                            className={cn("size-1.5 rounded-full", STATUS[item.status].dot)}
                            aria-hidden
                          />
                          {STATUS[item.status].label}
                        </span>
                      </div>
                      <p className="mt-2 font-bold">{item.title}</p>
                      <p className="mt-0.5 text-sm text-text-2">
                        <span className="nowrap-token">{item.date}</span>
                        <span className="mx-2 text-text-3" aria-hidden>
                          /
                        </span>
                        {item.place}
                      </p>
                    </div>
                    <ChevronRight
                      className="size-5 shrink-0 text-text-3 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </FadeIn>
    </Section>
  );
}
