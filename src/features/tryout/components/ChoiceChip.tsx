import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A radio or checkbox drawn as a pill. The real input stays in the form (works without JS). */
export function ChoiceChip({
  children,
  sub,
  className,
  ...input
}: Omit<ComponentProps<"input">, "children"> & {
  type: "radio" | "checkbox";
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-xl border border-line bg-white px-3 py-2 text-center transition-colors",
        "hover:border-gray-300 has-checked:border-text has-checked:bg-text has-checked:text-white",
        "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-text",
        "has-disabled:cursor-not-allowed has-disabled:opacity-40",
        className,
      )}
    >
      <input {...input} className="sr-only" />
      <span className="font-display text-[15px] font-bold">{children}</span>
      {sub && <span className="mt-0.5 text-xs opacity-75">{sub}</span>}
    </label>
  );
}
