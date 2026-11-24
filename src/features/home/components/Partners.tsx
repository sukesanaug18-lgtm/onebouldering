import Image from "next/image";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Gym } from "@/content/gyms";
import { cn } from "@/lib/cn";

/**
 * Member gym logos (CLAUDE.md 5-7). Static grid, no auto-scrolling.
 * Sponsors differ per event, so they are on each event page (EventPage), not here.
 */
export function Partners({ gyms }: { gyms: Gym[] }) {
  return (
    <Section tone="subtle" aria-labelledby="partners-title">
      <SectionHeading
        id="partners-title"
        eyebrow="Gyms"
        title="参加ジム"
        description={`全国 ${gyms.length} のジムが参加しています。`}
      />
      <FadeIn className="mt-8">
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {gyms.map((g) => (
            <li
              key={g.logo}
              className={cn(
                "flex aspect-[3/2] items-center justify-center rounded-xl border p-3",
                g.dark ? "border-transparent bg-text" : "border-line bg-white",
              )}
            >
              <Image
                src={g.logo}
                alt={g.name}
                width={160}
                height={100}
                className="max-h-full w-auto object-contain"
              />
            </li>
          ))}
        </ul>
      </FadeIn>
    </Section>
  );
}
