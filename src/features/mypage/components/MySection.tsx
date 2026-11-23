import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/** A titled block on the my page. `empty` replaces the body with a short note. */
export function MySection({
  title,
  action,
  accent,
  empty,
  children,
}: {
  title: string;
  action?: ReactNode;
  accent?: "tnfc" | "tryout" | "ranking";
  empty?: string | false;
  children?: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      <Card accent={accent} className="bg-white">
        {empty ? <p className="text-sm text-text-3">{empty}</p> : children}
      </Card>
    </section>
  );
}

export function SectionSkeleton() {
  return (
    <div aria-busy="true">
      <div className="mb-3 h-6 w-32 rounded bg-bg-subtle" />
      <div className="h-32 rounded-2xl bg-bg-subtle" />
    </div>
  );
}

/** "2026-11-21T03:49:36Z" → "2026/11/21" (Japan time). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}
