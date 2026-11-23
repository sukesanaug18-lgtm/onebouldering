import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { guidelineText, planSessionGroups } from "@/domain/tnfc";
import { shortDate } from "@/features/mypage/components/MySection";
import { CopyButton, RoundForm } from "@/features/tnfc/components/TnfcForms";
import { Block, PageSkeleton } from "@/features/tnfc/components/Parts";
import { getRound, getRoundEntries } from "@/features/tnfc/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "TNFC 大会情報" };

async function Info({ params }: { params: PageProps<"/admin/tnfc/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const [round, entries] = await Promise.all([getRound(id), getRoundEntries(id)]);
  if (!round) notFound();
  const groups = planSessionGroups(entries, round.areaCount);
  const text = guidelineText({
    roundName: round.roundName,
    venueName: round.venueName,
    eventDate: round.eventDate.replaceAll("-", "/"),
    entryDeadline: round.entryDeadline.replaceAll("-", "/"),
    groups,
    checklist: round.checklist,
  });
  return (
    <div className="space-y-8">
      <Block title="大会情報">
        <RoundForm round={round} />
        {round.updatedBy && (
          <p className="mt-4 text-xs text-text-3">
            最終更新 {shortDate(round.updatedAt)}（{round.updatedBy}）
          </p>
        )}
      </Block>
      <Block
        title="要項のたたき台（1.1.3）"
        description="今のエントリーで組んだグループと、会場に確認する8項目を並べたものです。前年の要項と合わせて会場に確認してください。"
      >
        <pre className="max-h-80 overflow-auto rounded-xl bg-bg-subtle p-4 text-sm whitespace-pre-wrap">
          {text}
        </pre>
        <div className="mt-4">
          <CopyButton text={text} label="要項のたたき台をコピー" />
        </div>
      </Block>
    </div>
  );
}

export default function RoundInfoPage(props: PageProps<"/admin/tnfc/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Info params={props.params} />
    </Suspense>
  );
}
