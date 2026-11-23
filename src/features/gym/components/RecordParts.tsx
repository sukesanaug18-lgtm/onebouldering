import NextForm from "next/form";
import { Search } from "lucide-react";
import { divisionName } from "@/domain/division";
import { cn } from "@/lib/cn";

export const divisionLabel = divisionName;

/** "2026-11-21T03:49:36Z" → "11/21 12:49" (Japan time). */
export function shortDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Name, license number, Division and time on one line (wraps on phones). */
export function PlayerLine({
  name,
  userId,
  division,
  at,
}: {
  name: string;
  userId: string;
  division: string;
  at: string;
}) {
  return (
    <div className="min-w-0">
      <p className="font-bold">
        {name}
        <span className="ml-2 text-sm font-medium text-text-3 tabular-nums">No.{userId}</span>
      </p>
      <p className="text-sm text-text-2">
        <span className="font-display font-bold">{divisionLabel(division)}</span>
        {at && <span className="ml-2 text-text-3 tabular-nums">{shortDateTime(at)} 提出</span>}
      </p>
    </div>
  );
}

/** Sent problem numbers as small tiles. `highlight` marks the new (not yet approved) ones. */
export function ProblemTiles({ sent, highlight = [] }: { sent: number[]; highlight?: number[] }) {
  const isNew = new Set(highlight);
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="完登した課題">
      {sent.map((n) => (
        <li
          key={n}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg font-display text-sm font-bold tabular-nums",
            isNew.has(n) ? "bg-text text-white" : "border border-line bg-bg-subtle text-text-2",
          )}
        >
          {n}
        </li>
      ))}
    </ul>
  );
}

/** GET search by name or license number (?q=). */
export function RecordSearch({ q, action }: { q: string; action: string }) {
  return (
    <NextForm action={action} className="relative" role="search">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-text-3"
        aria-hidden
      />
      <input
        name="q"
        type="search"
        defaultValue={q}
        placeholder="氏名・ライセンスNo.で検索"
        aria-label="氏名・ライセンスNo.で検索"
        className="block min-h-12 w-full rounded-xl border border-line bg-white pr-4 pl-11 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
      />
    </NextForm>
  );
}

export function ListSkeleton() {
  return (
    <div aria-busy="true" className="space-y-3">
      <div className="h-12 rounded-xl bg-white" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-36 rounded-2xl bg-white" />
      ))}
    </div>
  );
}
