import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { divisionName } from "@/domain/division";
import { entryName, isPaid, type TnfcEntry } from "@/domain/tnfc";
import { cn } from "@/lib/cn";

export function Block({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-2">{description}</p>}
      <Card className="mt-3 bg-white">{children}</Card>
    </section>
  );
}

export const PageSkeleton = () => <div className="h-96 rounded-2xl bg-white" aria-busy="true" />;

/** Entries as a scrollable table (bib, name, category, payment or a note, group). */
export function EntryTable({
  entries,
  note,
  showGroup = false,
}: {
  entries: TnfcEntry[];
  note?: (e: TnfcEntry) => ReactNode;
  showGroup?: boolean;
}) {
  if (entries.length === 0) return <p className="text-sm text-text-3">該当する人はいません。</p>;
  return (
    <div className="-mx-5 overflow-x-auto md:-mx-6">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-text-3">
            <th scope="col" className="py-2 pl-5 font-medium md:pl-6">
              ゼッケン
            </th>
            <th scope="col" className="py-2 font-medium">
              氏名・ライセンスNo.
            </th>
            <th scope="col" className="py-2 font-medium">
              カテゴリー
            </th>
            {showGroup && (
              <th scope="col" className="py-2 font-medium">
                グループ
              </th>
            )}
            <th scope="col" className="py-2 pr-5 font-medium md:pr-6">
              {note ? "内容" : "入金"}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr
              key={e.id}
              className={cn(
                "border-b border-line last:border-0",
                e.status === "cancelled" && "text-text-3",
              )}
            >
              <td className="py-2.5 pl-5 font-display font-bold tabular-nums md:pl-6">
                {e.bibNo ?? "—"}
              </td>
              <td className="py-2.5">
                <span className="font-bold">{entryName(e)}</span>
                <span className="ml-2 text-xs text-text-3 tabular-nums">No.{e.userId}</span>
                {e.status === "cancelled" && (
                  <span className="ml-2 text-xs font-bold text-[#b91c1c]">キャンセル</span>
                )}
              </td>
              <td className="py-2.5 whitespace-nowrap">{divisionName(e.division)}</td>
              {showGroup && <td className="py-2.5 whitespace-nowrap">{e.sessionGroup || "—"}</td>}
              <td className="py-2.5 pr-5 md:pr-6">
                {note ? (
                  note(e)
                ) : isPaid(e) ? (
                  <span className="text-[#047857]">入金済み</span>
                ) : (
                  <span className="font-bold text-[#a16207]">未入金</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
