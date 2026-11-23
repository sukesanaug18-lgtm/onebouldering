import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import { bccList, entryName, findEntryIssues } from "@/domain/tnfc";
import { CopyButton, RoundActionButton } from "@/features/tnfc/components/TnfcForms";
import { Block, EntryTable, PageSkeleton } from "@/features/tnfc/components/Parts";
import { getRound, getRoundWithMembers } from "@/features/tnfc/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC 締切前チェック" };

async function Checks({ params }: { params: PageProps<"/admin/tnfc/[id]/checks">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const round = await getRound(id);
  if (!round) notFound();
  const { entries, members } = await getRoundWithMembers(id);
  const issues = findEntryIssues(entries, members);
  const renamed = new Map(issues.renamed.map((x) => [x.entry.id, x.now]));
  const divChanged = new Map(issues.divisionChanged.map((x) => [x.entry.id, x.now]));
  const diffEntries = entries.filter((e) => renamed.has(e.id) || divChanged.has(e.id));

  return (
    <div className="space-y-8">
      <Block
        title={`未入金（${issues.unpaid.length}人）`}
        description="ZEUS のオーダーNo. が空欄の人です。アドレスをコピーして、BCC で入金のお願いを送ってください。"
      >
        <EntryTable entries={issues.unpaid} />
        <div className="mt-4">
          <CopyButton text={bccList(issues.unpaid)} label="BCC 用アドレスをコピー" />
        </div>
      </Block>

      <Block
        title={`Division 未確定（${issues.undecided.length}人）`}
        description="まだ Division Tryout を受けていない人です。Tryout の案内を BCC で送ってください。"
      >
        <EntryTable entries={issues.undecided} />
        <div className="mt-4">
          <CopyButton text={bccList(issues.undecided)} label="BCC 用アドレスをコピー" />
        </div>
      </Block>

      <Block
        title={`会員情報との違い（${diffEntries.length}人）`}
        description="申し込んだあとに名前が変わった人や、Tryout などで Division が変わった人です。「会員情報にそろえる」で、エントリーをまとめて直します。"
      >
        <EntryTable
          entries={diffEntries}
          note={(e) => (
            <span className="block space-y-0.5">
              {renamed.has(e.id) && (
                <span className="block">
                  氏名：{entryName(e)} → <b>{renamed.get(e.id)}</b>
                </span>
              )}
              {divChanged.has(e.id) && (
                <span className="block">
                  Division：{divisionName(e.division)} →{" "}
                  <b>{divisionName(divChanged.get(e.id) ?? "")}</b>
                </span>
              )}
            </span>
          )}
        />
        {/* Always shown so the result message stays after the list empties. */}
        <div className="mt-4">
          <RoundActionButton
            kind="sync"
            roundId={round.id}
            label="会員情報にそろえる"
            variant={diffEntries.length > 0 ? "primary" : "secondary"}
            confirmText={
              diffEntries.length > 0
                ? `${diffEntries.length}人のエントリーを、今の会員情報（氏名・Division）にそろえます。よろしいですか？`
                : undefined
            }
          />
        </div>
      </Block>
    </div>
  );
}

export default function RoundChecksPage(props: PageProps<"/admin/tnfc/[id]/checks">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Checks params={props.params} />
    </Suspense>
  );
}
