import Image from "next/image";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Gym } from "@/content/gyms";
import { cn } from "@/lib/cn";
import { SampleNote } from "./SampleNote";

/** Official sponsors and member gym logos (CLAUDE.md 5-7). Static grid, no auto-scrolling. */
export function Partners({
  sponsors,
  gyms,
}: {
  sponsors: { name: string; logo: string }[];
  gyms: Gym[];
}) {
  return (
    <Section tone="subtle" aria-labelledby="partners-title">
      <SectionHeading
        id="partners-title"
        eyebrow="Official sponsors"
        title="オフィシャルスポンサー"
        action={
          <Button href="/sponsors" variant="text">
            スポンサー一覧
          </Button>
        }
      />
      <SampleNote />
      <FadeIn className="mt-8">
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {sponsors.map((s) => (
            <li
              key={s.name}
              className="flex h-28 items-center justify-center rounded-2xl border border-line bg-white px-8"
            >
              <Image
                src={s.logo}
                alt={s.name}
                width={240}
                height={80}
                className="max-h-12 w-auto object-contain"
              />
            </li>
          ))}
        </ul>
      </FadeIn>

      <h3 className="mt-20 font-bold">
        参加ジム
        <span className="ml-2 font-display text-text-3 tabular-nums">{gyms.length}</span>
      </h3>
      <FadeIn className="mt-6">
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
