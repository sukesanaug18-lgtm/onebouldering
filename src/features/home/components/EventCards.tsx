import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { EVENTS } from "@/content/events";

/** The three events, same card shape (CLAUDE.md 5-2). Whole card is clickable. */
export function EventCards() {
  return (
    <Section id="events" aria-labelledby="events-title">
      <SectionHeading id="events-title" eyebrow="Events" title="3つのイベント" />
      <ul className="mt-10 grid gap-4 md:grid-cols-3">
        {EVENTS.map((event, i) => (
          <FadeIn as="li" key={event.key} delay={i * 0.06}>
            <Card accent={event.key} interactive padding="lg" className="flex h-full flex-col">
              <p className="text-sm font-bold text-text-3">{event.kind}</p>
              <h3 className="mt-1 font-display text-2xl font-bold tracking-tight">
                <Link
                  href={event.href}
                  className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-text"
                >
                  {event.name}
                </Link>
              </h3>
              <p className="mt-4 flex-1 text-[15px] text-text-2">{event.summary}</p>
              <p className="mt-6 flex items-center gap-2 text-sm text-text-2">
                <CalendarDays className="size-4 shrink-0 text-text-3" aria-hidden />
                {event.period}
              </p>
              <span
                className="mt-6 inline-flex items-center gap-1 font-display text-[15px] font-bold"
                aria-hidden
              >
                参加する
                <ChevronRight className="size-4" />
              </span>
            </Card>
          </FadeIn>
        ))}
      </ul>
    </Section>
  );
}
