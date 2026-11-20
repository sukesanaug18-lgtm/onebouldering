import Link from "next/link";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { JOURNEY } from "@/content/events";

/** How to join, as one diagram: 4 steps in a row (PC) or a column (phone). CLAUDE.md 5-3. */
export function Journey() {
  return (
    <Section tone="subtle" aria-labelledby="journey-title">
      <SectionHeading
        id="journey-title"
        eyebrow="How to join"
        title="参加の流れ"
        action={
          <Button href="/join" variant="text">
            はじめての方へ
          </Button>
        }
      />
      <ol className="mt-12 grid gap-0 md:grid-cols-4 md:gap-6">
        {JOURNEY.map((step, i) => (
          <FadeIn
            as="li"
            key={step.title}
            delay={i * 0.06}
            className="relative pb-10 pl-14 md:pb-0 md:pl-0"
          >
            {/* connector line */}
            {i < JOURNEY.length - 1 && (
              <span
                className="absolute top-10 bottom-0 left-5 w-px bg-line md:top-5 md:right-[-1.5rem] md:bottom-auto md:left-12 md:h-px md:w-auto"
                aria-hidden
              />
            )}
            <span className="absolute top-0 left-0 flex size-10 items-center justify-center rounded-full border border-line bg-white font-display text-sm font-bold md:static">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="pt-2 text-lg font-bold md:mt-5 md:pt-0">
              <Link href={step.href} className="hover:underline hover:underline-offset-4">
                {step.title}
              </Link>
            </h3>
            <p className="mt-2 text-[15px] text-text-2">{step.text}</p>
          </FadeIn>
        ))}
      </ol>
    </Section>
  );
}
