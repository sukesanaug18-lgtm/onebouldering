import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * Standard card (CLAUDE.md 6-2): no strong shadow, a 1px border and a light
 * background blur. `accent` adds a thin event-color line on top (6-5).
 * `interactive` adds the hover state for clickable cards (6-3).
 */
type Accent = "tnfc" | "tryout" | "ranking";

const accents: Record<Accent, string> = {
  tnfc: "before:bg-event-tnfc",
  tryout: "before:bg-event-tryout",
  ranking: "before:bg-event-ranking",
};

export type CardProps = ComponentProps<"div"> & {
  accent?: Accent;
  interactive?: boolean;
  padding?: "md" | "lg";
};

export function Card({
  accent,
  interactive = false,
  padding = "md",
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-line bg-white/70 backdrop-blur-md",
        padding === "md" ? "p-6" : "p-8 md:p-10",
        accent &&
          "before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-['']",
        accent && accents[accent],
        interactive &&
          "transition-colors duration-200 focus-within:border-gray-300 hover:border-gray-300 hover:bg-white",
        className,
      )}
      {...rest}
    />
  );
}
