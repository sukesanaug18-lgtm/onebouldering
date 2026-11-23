import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getDashboard } from "@/features/admin/queries";
import { CURRENT_SEASON_ID, seasonLabel } from "@/lib/season";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "ダッシュボード" };

async function Numbers() {
  await requireAdmin();
  const d = await getDashboard(CURRENT_SEASON_ID);
  const tiles = [
    { label: "会員", value: d.members, href: "/admin/members" },
    { label: "Division 未確定", value: d.undecided, href: "/admin/members?undecided=1" },
    { label: "承認待ちスコア", value: d.pending },
    { label: "Tryout 受験（今シーズン）", value: d.tryouts },
    { label: "TNFC エントリー（有効）", value: d.tnfcEntries },
  ];
  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {tiles.map((t) => {
          const body = (
            <>
              <dt className="text-sm text-text-3">{t.label}</dt>
              <dd className="mt-1 font-display text-3xl font-extrabold tabular-nums">
                {t.value.toLocaleString()}
              </dd>
            </>
          );
          return t.href ? (
            <Link
              key={t.label}
              href={t.href}
              className="rounded-2xl border border-line bg-white p-4 transition-colors hover:border-gray-300"
            >
              {body}
            </Link>
          ) : (
            <div key={t.label} className="rounded-2xl border border-line bg-white p-4">
              {body}
            </div>
          );
        })}
      </dl>

      <section className="rounded-2xl border border-line bg-white p-4 md:p-6">
        <h2 className="font-bold">承認待ちが残っている会場</h2>
        {d.pendingByVenue.length === 0 ? (
          <p className="mt-2 text-sm text-text-3">承認待ちはありません。</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {d.pendingByVenue.map((v) => (
              <li key={v.venueId} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0 truncate">{v.name}</span>
                <span className="font-display font-extrabold tabular-nums">{v.count}件</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        {seasonLabel(CURRENT_SEASON_ID)} シーズンの状況です。
      </p>
      <Suspense fallback={<div className="h-64 rounded-2xl bg-white" aria-busy="true" />}>
        <Numbers />
      </Suspense>
    </>
  );
}
