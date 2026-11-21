import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { VenueDetail } from "../queries";

/** Page frame for the venue screens (/entry, /tryout): venue name and its programs on top. */
export function EntryShell({
  eyebrow,
  title,
  venue,
  children,
}: {
  eyebrow: string;
  title?: string;
  venue?: VenueDetail | null;
  children: ReactNode;
}) {
  return (
    <main className="bg-bg-subtle px-5 py-12 md:py-20">
      <div className="mx-auto max-w-[640px]">
        <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{venue?.name ?? title}</h1>
        {venue && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-text-2">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden />
              {venue.region}
            </span>
            {venue.programs.hasTryout && (
              <Badge event="tryout">Tryout {venue.programs.tryoutPeriod}</Badge>
            )}
            {venue.programs.hasRanking && (
              <Badge event="ranking">Ranking {venue.programs.rankingPeriod}</Badge>
            )}
          </div>
        )}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
