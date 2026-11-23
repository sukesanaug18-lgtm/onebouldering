import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Download } from "lucide-react";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import {
  CANCEL_TYPES,
  CONTACT_CHANNELS,
  type CancelType,
  type ContactChannel,
} from "@/domain/tnfc-finals";
import { PageSkeleton } from "@/features/tnfc/components/Parts";
import { getCancellations } from "@/features/tnfc/queries";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC キャンセル台帳" };

// The コンビニ返金・キャンセル料 list (workflow diagram B-5 1.2.3), filled by cancellations and
// finals declines.

async function Ledger() {
  await requireAdmin();
  const rows = await getCancellations(CURRENT_SEASON_ID);
  const total = (t: CancelType) =>
    rows.filter((r) => r.cancelType === t).reduce((s, r) => s + r.amount, 0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-text-2 tabular-nums">
          {rows.length}件 ・ コンビニ返金 {total("convenience_refund").toLocaleString()}円 ・
          キャンセル料 {total("cancellation_fee").toLocaleString()}円
        </p>
        <a
          href="/api/admin/tnfc/cancellations"
          download
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-5 text-sm font-bold hover:border-gray-300"
        >
          <Download className="size-4" aria-hidden />
          CSV
        </a>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-text-2">
          まだ記録はありません。各大会の「キャンセル・会場変更」から処理すると、ここに入ります。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white px-5 py-2 md:px-6">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs text-text-3">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">処理日</th>
                <th className="py-2 font-medium">大会</th>
                <th className="py-2 font-medium">氏名・ID</th>
                <th className="py-2 font-medium">区分</th>
                <th className="py-2 text-right font-medium">金額</th>
                <th className="py-2 pl-4 font-medium">連絡・メモ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 whitespace-nowrap tabular-nums">
                    {r.processedAt.slice(0, 10).replaceAll("-", "/")}
                  </td>
                  <td className="py-2.5">{r.roundName}</td>
                  <td className="py-2.5">
                    <span className="font-bold">{r.userName}</span>
                    <span className="ml-2 text-xs text-text-3 tabular-nums">No.{r.userId}</span>
                    <span className="block text-xs text-text-3">{divisionName(r.division)}</span>
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    {CANCEL_TYPES[r.cancelType as CancelType] ?? r.cancelType}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {r.amount > 0 ? `${r.amount.toLocaleString()}円` : "—"}
                  </td>
                  <td className="py-2.5 pl-4 text-text-2">
                    {CONTACT_CHANNELS[r.contactChannel as ContactChannel] ?? r.contactChannel}
                    {r.note && <span className="block text-xs">{r.note}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CancellationsPage() {
  return (
    <>
      <Link
        href="/admin/tnfc"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        予選一覧へ
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">キャンセル台帳</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        Season {seasonLabel(CURRENT_SEASON_ID)}{" "}
        のキャンセル・本戦辞退の記録（コンビニ返金・キャンセル料の一覧）。
      </p>
      <Suspense fallback={<PageSkeleton />}>
        <Ledger />
      </Suspense>
    </>
  );
}
