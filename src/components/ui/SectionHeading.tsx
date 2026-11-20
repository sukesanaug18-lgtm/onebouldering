import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Phrase } from "./Phrase";

/** Section title: small English label + Japanese heading + optional action on the right. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  id,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-4", className)}>
      <div className="max-w-[40em]">
        <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          {eyebrow}
        </p>
        <h2
          id={id}
          className="mt-2 text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] font-bold tracking-tight"
        >
          <Phrase>{title}</Phrase>
        </h2>
        {description && <p className="mt-3 text-text-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
