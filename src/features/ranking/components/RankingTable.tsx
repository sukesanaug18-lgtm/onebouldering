import { Fragment } from "react";
import { withRanks, type RankingEntry } from "@/domain/ranking";
import { cn } from "@/lib/cn";

/**
 * Ranking list. Ties share a rank. When `cutoff` > 0, a line marks the current
 * automatic promotion zone (top 10%, current site rule).
 */
export function RankingTable({
  entries,
  cutoff = 0,
  caption,
}: {
  entries: RankingEntry[];
  cutoff?: number;
  caption: string;
}) {
  const rows = withRanks(entries);
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white/70 backdrop-blur-md">
      <table className="w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line text-xs font-bold text-text-3">
            <th scope="col" className="w-16 py-3 pl-5 md:w-20 md:pl-8">
              順位
            </th>
            <th scope="col" className="py-3">
              選手
            </th>
            <th scope="col" className="py-3 pr-5 text-right md:pr-8">
              ポイント
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <Fragment key={row.id}>
              <tr className="border-b border-line last:border-0">
                <td className="py-3.5 pl-5 md:pl-8">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full font-display text-base font-extrabold tabular-nums",
                      row.rank === 1 && "bg-brand text-text",
                      row.rank === 2 && "bg-[#e5e7eb] text-text",
                      row.rank === 3 && "bg-[#f3e1cf] text-text",
                      row.rank > 3 && "text-text-2",
                    )}
                  >
                    {row.rank}
                  </span>
                </td>
                <td className="py-3.5">
                  <p className="font-bold">{row.name}</p>
                  <p className="font-display text-xs text-text-3 tabular-nums">No. {row.id}</p>
                </td>
                <td className="py-3.5 pr-5 text-right font-display text-lg font-bold tabular-nums md:pr-8">
                  {row.score.toLocaleString("ja-JP")}
                  <span className="ml-1 text-xs font-medium text-text-3">pt</span>
                </td>
              </tr>
              {cutoff > 0 && i === cutoff - 1 && i < rows.length - 1 && (
                <tr aria-hidden>
                  <td colSpan={3} className="px-5 md:px-8">
                    <div className="flex items-center gap-3 py-2">
                      <span className="h-px flex-1 border-t border-dashed border-[#ca8a04]" />
                      <span className="text-xs font-bold text-[#a16207]">
                        ここまでが自動昇格圏内（上位10%）
                      </span>
                      <span className="h-px flex-1 border-t border-dashed border-[#ca8a04]" />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
