import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/** Page section with the standard spacing (80px phone / 128px PC) and 1200px width (CLAUDE.md 6-8). */
export function Section({
  tone = "default",
  className,
  children,
  ...rest
}: ComponentProps<"section"> & { tone?: "default" | "subtle" }) {
  return (
    <section
      className={cn("py-20 md:py-32", tone === "subtle" && "bg-bg-subtle", className)}
      {...rest}
    >
      <div className="mx-auto max-w-[1200px] px-5">{children}</div>
    </section>
  );
}
