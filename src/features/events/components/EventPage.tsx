import Image from "next/image";
import { ChevronDown } from "lucide-react";
import type { Poster } from "@/features/posters/config";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RankingLogo } from "@/components/ui/RankingLogo";
import { Phrase } from "@/components/ui/Phrase";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { cn } from "@/lib/cn";
import type { EventPageContent } from "../types";

const ACCENT_TEXT = {
  tnfc: "text-text",
  tryout: "text-event-tryout",
  ranking: "text-event-ranking-text", // the logo orange is too light for text (6-5)
} as const;

const IN_PAGE = [
  { id: "overview", label: "概要" },
  { id: "categories", label: "対象" },
  { id: "steps", label: "参加の流れ" },
  { id: "schedule", label: "日程・会場" },
  { id: "rules", label: "ルール" },
  { id: "faq", label: "よくある質問" },
];

function PosterImage({ poster, name }: { poster: Poster; name: string }) {
  return (
    <Image
      src={poster.src}
      alt={`${name} のポスター`}
      width={poster.width}
      height={poster.height}
      priority
      // Uploaded posters are already resized to WebP on the server.
      unoptimized={poster.custom}
      sizes="(min-width: 1024px) 360px, 320px"
      className="h-auto w-full rounded-2xl border border-line"
    />
  );
}

/** Shared layout for the three event pages (CLAUDE.md 5). The poster is set in the office. */
export function EventPage({
  content: c,
  poster = null,
}: {
  content: EventPageContent;
  poster?: Poster | null;
}) {
  return (
    <main>
      {/* Header */}
      <section className="border-b border-line">
        <div
          className={cn(
            "mx-auto max-w-[1200px] px-5 pt-16 pb-12 md:pt-24 md:pb-16",
            poster && "lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-16",
          )}
        >
          {poster && (
            <div className="hidden lg:col-start-2 lg:row-start-1 lg:block">
              <PosterImage poster={poster} name={c.name} />
            </div>
          )}
          <div className="min-w-0 lg:col-start-1 lg:row-start-1">
            {c.key === "ranking" && <RankingLogo decorative className="mb-6 h-20 md:h-24" />}
            <Badge event={c.key}>{c.kind}</Badge>
            <h1 className="mt-5 font-display text-[clamp(2.25rem,1.5rem+3vw,4rem)] leading-[1.1] font-bold tracking-tight">
              {c.name}
            </h1>
            <p className="mt-5 max-w-[36em] text-text-2 md:text-lg">
              <Phrase>{c.lead}</Phrase>
            </p>
            {poster && (
              <div className="mt-8 max-w-[320px] lg:hidden">
                <PosterImage poster={poster} name={c.name} />
              </div>
            )}
            <div className="mt-8 hidden flex-wrap gap-3 lg:flex">
              <Button href={c.primary.href} size="lg">
                {c.primary.label}
              </Button>
              {c.secondary && (
                <Button href={c.secondary.href} variant="secondary" size="lg">
                  {c.secondary.label}
                </Button>
              )}
            </div>
            <nav aria-label="このページの目次" className="-mx-5 mt-10 overflow-x-auto px-5">
              <ul className="flex gap-2">
                {IN_PAGE.map((l) => (
                  <li key={l.id}>
                    <a
                      href={`#${l.id}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-bold whitespace-nowrap text-text-2 transition-colors duration-200 hover:border-gray-300 hover:text-text"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>

      {/* Overview */}
      <Section id="overview" aria-labelledby="overview-title" className="scroll-mt-16">
        <SectionHeading id="overview-title" eyebrow="Overview" title="概要" />
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {c.facts.map((f, i) => (
            <FadeIn key={f.label} delay={i * 0.06}>
              <Card accent={c.key} className="h-full">
                <p
                  className={cn(
                    "font-display text-4xl font-extrabold tracking-tight",
                    ACCENT_TEXT[c.key],
                  )}
                >
                  {f.value}
                  {f.unit && <span className="ml-1 text-lg font-bold">{f.unit}</span>}
                </p>
                <p className="mt-2 text-sm text-text-2">{f.label}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
        <FadeIn className="mt-10 max-w-[40em] space-y-4 text-text-2">
          {c.overview.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </FadeIn>
      </Section>

      {/* Categories */}
      <Section
        id="categories"
        tone="subtle"
        aria-labelledby="categories-title"
        className="scroll-mt-16"
      >
        <SectionHeading id="categories-title" eyebrow="Categories" title="対象・カテゴリー" />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {c.categories.map((cat, i) => (
            <FadeIn key={cat.title} delay={i * 0.06}>
              <Card padding="lg" className="h-full">
                <h3 className="font-bold">{cat.title}</h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-line bg-white px-3 py-1 font-display text-sm font-bold"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
                {cat.note && <p className="mt-4 text-sm text-text-2">{cat.note}</p>}
              </Card>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* Steps */}
      <Section id="steps" aria-labelledby="steps-title" className="scroll-mt-16">
        <SectionHeading id="steps-title" eyebrow="How to join" title="参加の流れ" />
        <ol className="mt-12 grid gap-0 md:grid-cols-4 md:gap-6">
          {c.steps.map((step, i) => (
            <FadeIn
              as="li"
              key={step.title}
              delay={i * 0.06}
              className="relative pb-10 pl-14 md:pb-0 md:pl-0"
            >
              {i < c.steps.length - 1 && (
                <span
                  className="absolute top-10 bottom-0 left-5 w-px bg-line md:top-5 md:right-[-1.5rem] md:bottom-auto md:left-12 md:h-px md:w-auto"
                  aria-hidden
                />
              )}
              <span className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-full border border-line bg-white font-display text-sm font-bold md:static">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="pt-2 text-lg font-bold md:mt-5 md:pt-0">{step.title}</h3>
              <p className="mt-2 text-[15px] text-text-2">{step.text}</p>
            </FadeIn>
          ))}
        </ol>
      </Section>

      {/* Schedule */}
      <Section
        id="schedule"
        tone="subtle"
        aria-labelledby="schedule-title"
        className="scroll-mt-16"
      >
        <SectionHeading
          id="schedule-title"
          eyebrow="Schedule"
          title="日程・会場"
          action={
            <Button href="/schedule" variant="text">
              日程をすべて見る
            </Button>
          }
        />
        <FadeIn className="mt-8">
          <Card padding="lg">
            <p className="text-text-2">{c.schedule.text}</p>
            {c.schedule.places && (
              <dl className="mt-6 divide-y divide-line border-t border-line">
                {c.schedule.places.map((p) => (
                  <div key={p.label} className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-8">
                    <dt className="w-32 shrink-0 text-sm font-bold text-text-3">{p.label}</dt>
                    <dd className="font-bold">{p.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>
        </FadeIn>
      </Section>

      {/* Rules */}
      <Section id="rules" aria-labelledby="rules-title" className="scroll-mt-16">
        <SectionHeading
          id="rules-title"
          eyebrow="Rules"
          title="ルールの要点"
          action={
            <Button href="/rules" variant="text">
              ルール全文
            </Button>
          }
        />
        <div className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {c.rules.map((r) => (
            <FadeIn key={r.title}>
              <h3 className="font-bold">{r.title}</h3>
              <ul className="mt-3 space-y-2 text-[15px] text-text-2">
                {r.items.map((item) => (
                  <li key={item} className="relative pl-4">
                    <span
                      className="absolute top-[0.8em] left-0 size-1 rounded-full bg-text-3"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
          ))}
        </div>
        {c.tables?.map((t) => (
          <FadeIn key={t.caption} className="mt-12">
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[20rem] text-left text-[15px]">
                <caption className="border-b border-line bg-bg-subtle px-5 py-3 text-left font-bold">
                  {t.caption}
                </caption>
                <thead>
                  <tr className="border-b border-line text-sm text-text-3">
                    {t.head.map((h) => (
                      <th key={h} scope="col" className="px-5 py-3 font-bold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {t.rows.map((row) => (
                    <tr key={row.join()}>
                      {row.map((cell, ci) => (
                        <td
                          key={ci}
                          className={cn(
                            "px-5 py-3",
                            ci === 0 ? "font-bold" : "font-display tabular-nums",
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {t.note && <p className="mt-3 text-sm text-text-3">{t.note}</p>}
          </FadeIn>
        ))}
      </Section>

      {/* FAQ */}
      <Section id="faq" tone="subtle" aria-labelledby="faq-title" className="scroll-mt-16">
        <SectionHeading
          id="faq-title"
          eyebrow="FAQ"
          title="よくある質問"
          action={
            <Button href="/faq" variant="text">
              質問をすべて見る
            </Button>
          }
        />
        <FadeIn className="mt-8">
          <div className="divide-y divide-line rounded-2xl border border-line bg-white/70 backdrop-blur-md">
            {c.faq.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-bold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    className="size-5 shrink-0 text-text-3 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="px-6 pb-5 text-[15px] text-text-2">{item.a}</p>
              </details>
            ))}
          </div>
        </FadeIn>
      </Section>

      {/* Join (PC) */}
      <section className="hidden border-t border-line lg:block">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-5 py-16">
          <p className="font-display text-2xl font-bold">{c.name}</p>
          <div className="flex gap-3">
            {c.secondary && (
              <Button href={c.secondary.href} variant="secondary" size="lg">
                {c.secondary.label}
              </Button>
            )}
            <Button href={c.primary.href} size="lg">
              {c.primary.label}
            </Button>
          </div>
        </div>
      </section>

      {/* Join (phone): fixed above the bottom tabs */}
      <div
        data-sticky-cta
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-white/80 px-5 py-3 backdrop-blur-md lg:hidden"
      >
        <Button href={c.primary.href} className="w-full">
          {c.primary.label}
        </Button>
      </div>
    </main>
  );
}
