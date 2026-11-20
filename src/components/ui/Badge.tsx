import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Small pill label. `event` adds the event color dot (CLAUDE.md 6-5). */
export type EventKey = "tnfc" | "tryout" | "ranking";

const dots: Record<EventKey, string> = {
  tnfc: "bg-event-tnfc",
  tryout: "bg-event-tryout",
  ranking: "bg-event-ranking",
};

export function Badge({
  event,
  tone = "light",
  className,
  children,
}: {
  event?: EventKey;
  tone?: "light" | "dark";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display text-xs font-bold whitespace-nowrap",
        tone === "light"
          ? "border-line bg-white/70 text-text-2"
          : "border-white/20 bg-white/10 text-white/85",
        className,
      )}
    >
      {event && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            dots[event],
            tone === "dark" && event === "tnfc" && "bg-white",
          )}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
