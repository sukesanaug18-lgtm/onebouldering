import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import { categoryRank, isActiveEntry, isPaid } from "@/domain/tnfc";
import { ImportEntriesForm } from "@/features/tnfc/components/TnfcForms";
import { Block, EntryTable, PageSkeleton } from "@/features/tnfc/components/Parts";
import { getRound, getRoundEntries } from "@/features/tnfc/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC エントリー" };

async function Entries({ params }: { params: PageProps<"/admin/tnfc/[id]/entries">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const [round, entries] = await Promise.all([getRound(id), getRoundEntries(id)]);
  if (!round) notFound();
  const active = entries.filter(isActiveEntry);
  const counts = new Map<string, number>();
  for (const e of active) counts.set(e.division, (counts.get(e.division) ?? 0) + 1);
  const sorted = [...entries].sort(
    (a, b) =>
      Number(!isActiveEntry(a)) - Number(!isActiveEntry(b)) ||
      categoryRank(a.division) - categoryRank(b.division) ||
      (a.bibNo ?? Infinity) - (b.bibNo ?? Infinity) ||
      a.userId.localeCompare(b.userId),
  );
  return (
    <div className="space-y-8">
      <Block
        title="エントリー CSV の取り込み"
        description="旧サイトの管理画面から書き出した CSV をそのまま使えます。締切後にもう一度取り込むと、入金・キャンセルが最新になります。"
      >
        <ImportEntriesForm roundId={round.id} />
      </Block>

      <section>
        <h2 className="text-lg font-bold">エントリー一覧</h2>
        <p className="mt-1 text-sm text-text-2 tabular-nums">
          {active.length}人{round.capacity > 0 && ` ／ 定員 ${round.capacity}人`}
          {` ・ 未入金 ${active.filter((e) => !isPaid(e)).length}人`}
          {entries.length > active.length && ` ・ キャンセル ${entries.length - active.length}人`}
        </p>
        {counts.size > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {[...counts]
              .sort((a, b) => categoryRank(a[0]) - categoryRank(b[0]))
              .map(([d, n]) => (
                <li key={d} className="rounded-full border border-line bg-white px-3 py-1 text-sm">
                  {divisionName(d)} <span className="font-bold tabular-nums">{n}</span>
                </li>
              ))}
          </ul>
        )}
        <div className="mt-4 rounded-2xl border border-line bg-white px-5 py-2 md:px-6">
          <EntryTable entries={sorted} showGroup />
        </div>
      </section>
    </div>
  );
}

export default function RoundEntriesPage(props: PageProps<"/admin/tnfc/[id]/entries">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Entries params={props.params} />
    </Suspense>
  );
}
