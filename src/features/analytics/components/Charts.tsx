import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Small chart pieces for the analytics page, drawn with plain HTML so they need no library.
// One series per chart (no legend: the title names it), thin bars with rounded tops anchored to
// the baseline, a recessive top gridline with the scale, and a hover / focus tooltip per bar.

export type Bar = { label: string; value: number; tip: string };

/** Vertical bars. `every` shows every Nth x label. */
export function BarChart({
  bars,
  every = 1,
  format = (n: number) => n.toLocaleString(),
  height = 160,
  label,
}: {
  bars: Bar[];
  every?: number;
  format?: (n: number) => string;
  height?: number;
  label: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <figure aria-label={label}>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" aria-hidden />
        <span className="absolute -top-2.5 right-0 bg-white pl-1 text-[11px] text-text-3 tabular-nums">
          {format(max)}
        </span>
        <ul className="absolute inset-0 flex items-end gap-[2px] border-b border-text-3/40">
          {bars.map((b) => (
            <li
              key={b.label}
              tabIndex={0}
              aria-label={b.tip}
              className="group relative flex h-full flex-1 items-end outline-none"
            >
              <span
                className="block w-full rounded-t-[4px] bg-text/75 transition-colors group-hover:bg-text group-focus-visible:bg-text"
                style={{ height: `${(b.value / max) * 100}%`, minHeight: b.value > 0 ? 2 : 0 }}
              />
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-text px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block group-focus-visible:block"
              >
                {b.tip}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <ul className="mt-1 flex h-4 gap-[2px] text-[11px] text-text-3 tabular-nums" aria-hidden>
        {bars.map((b, i) => (
          <li key={b.label} className="relative flex-1">
            {i % every === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                {b.label}
              </span>
            )}
          </li>
        ))}
      </ul>
    </figure>
  );
}

/** A number cell with a light bar behind it, for tables. */
export function BarCell({
  value,
  max,
  children,
}: {
  value: number;
  max: number;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-right tabular-nums">{children}</span>
      <span className="h-2 w-full min-w-16 rounded-full bg-bg-subtle" aria-hidden>
        <span
          className="block h-full rounded-full bg-text/70"
          style={{ width: `${max ? (value / max) * 100 : 0}%` }}
        />
      </span>
    </div>
  );
}

/** Headline number. */
export function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-white p-5")}>
      <p className="text-xs font-bold text-text-3">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-text-3">{note}</p>}
    </div>
  );
}
