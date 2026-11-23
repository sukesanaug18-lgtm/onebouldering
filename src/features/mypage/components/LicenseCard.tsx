import { shortDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { seasonLabel } from "@/lib/season";
import type { CurrentUser } from "@/server/auth";

/** Digital license card: name, license number and Division for the season. */
export function LicenseCard({ user, seasonId }: { user: CurrentUser; seasonId: string }) {
  const undecided = user.division === UNDECIDED_DIVISION;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-text p-6 text-white md:p-8">
      <div className="flex items-start justify-between gap-4">
        <p className="font-display text-xs font-bold tracking-[0.2em] text-white/60 uppercase">
          License
        </p>
        <p className="font-display text-xs font-bold whitespace-nowrap text-white/60">
          Season {seasonLabel(seasonId)}
        </p>
      </div>
      <p className="mt-6 text-sm text-white/60">{user.furigana}</p>
      <p className="text-2xl font-bold tracking-tight md:text-3xl">{user.name}</p>
      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-white/60">ライセンスNo.</dt>
          <dd className="font-display text-2xl font-extrabold tabular-nums md:text-3xl">
            {user.id}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-white/60">Division</dt>
          <dd className="font-display text-2xl font-extrabold md:text-3xl">
            {undecided ? "未確定" : shortDivision(user.division)}
          </dd>
        </div>
      </dl>
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -bottom-16 size-48 rounded-full border-[24px] border-white/5"
      />
    </div>
  );
}
