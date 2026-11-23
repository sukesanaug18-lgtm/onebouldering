import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import { categoryRank, entryName, isActiveEntry } from "@/domain/tnfc";
import { isFinalsRound } from "@/domain/tnfc-finals";
import { EntryOpsPanel } from "@/features/tnfc/components/OpsForms";
import { Block, PageSkeleton } from "@/features/tnfc/components/Parts";
import { getRound, getRoundEntries, listRounds } from "@/features/tnfc/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC キャンセル・会場変更" };

// Daily office work for one round (workflow diagram B-8 1.6.1–1.6.2, B-5 1.2.3).

async function Ops({ params }: { params: PageProps<"/admin/tnfc/[id]/ops">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const round = await getRound(id);
  if (!round) notFound();
  const [entries, rounds] = await Promise.all([getRoundEntries(id), listRounds(round.seasonId)]);
  const active = entries
    .filter(isActiveEntry)
    .sort(
      (a, b) =>
        categoryRank(a.division) - categoryRank(b.division) ||
        (a.bibNo ?? Infinity) - (b.bibNo ?? Infinity) ||
        a.userId.localeCompare(b.userId),
    );
  const targets = isFinalsRound(round)
    ? []
    : rounds
        .filter((r) => r.id !== round.id && !isFinalsRound(r) && r.status !== "completed")
        .map((r) => ({
          id: r.id,
          label: `ROUND${r.roundNumber} ${r.venueName}（${r.eventDate ? r.eventDate.replaceAll("-", "/") : "日程未定"}・${r.entries}人${r.capacity > 0 ? `／定員${r.capacity}` : ""}）`,
        }));

  return (
    <div className="space-y-8">
      <Block
        title="キャンセル・会場変更"
        description="メール・DM・電話で受けた連絡を、ここで処理します。処理すると、受け付けた手段で送る返信文が出ます。"
      >
        <EntryOpsPanel
          entries={active.map((e) => ({
            id: e.id,
            division: e.division,
            label: `${e.bibNo != null ? `No.${e.bibNo} ` : ""}${entryName(e)}（${e.userId}・${divisionName(e.division)}）`,
          }))}
          rounds={targets}
        />
      </Block>
      <p className="text-sm text-text-2">
        今シーズンのキャンセルの記録（コンビニ返金・キャンセル料の一覧）は{" "}
        <Link href="/admin/tnfc/cancellations" className="font-bold underline underline-offset-4">
          キャンセル台帳
        </Link>{" "}
        で見られます。
      </p>
    </div>
  );
}

export default function RoundOpsPage(props: PageProps<"/admin/tnfc/[id]/ops">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Ops params={props.params} />
    </Suspense>
  );
}
