import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/Field";
import { divisionName, UNDECIDED_DIVISION } from "@/domain/division";
import { parsePrefill } from "@/domain/score";
import { EntryShell } from "@/features/entry/components/EntryShell";
import { VenueGate } from "@/features/entry/components/VenueGate";
import { VenuePicker } from "@/features/entry/components/VenuePicker";
import { getVenue, param } from "@/features/entry/queries";
import { getPublicVenues } from "@/features/ranking/queries";
import { ScoreSheet } from "@/features/score/components/ScoreSheet";
import { getMyScore, getPointMap, type MyScore } from "@/features/score/queries";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { requireUser } from "@/server/auth";
import { venueCheckIn } from "@/server/venue-pass";

export const metadata: Metadata = { title: "Ranking スコア提出", robots: { index: false } };

// Ranking score sheet at a gym (workflow diagram B-2). Reached from the venue QR or the Tryout result.

async function Score({ searchParams }: { searchParams: PageProps<"/score">["searchParams"] }) {
  const sp = await searchParams;
  const venueId = param(sp.venue);
  const user = await requireUser(
    venueId ? `/score?venue=${encodeURIComponent(venueId)}` : "/score",
  );
  const venue = await getVenue(venueId);

  if (!venue) {
    const venues = await getPublicVenues();
    return (
      <EntryShell eyebrow="Ranking" title="スコアを提出するジム">
        <Card padding="lg" className="bg-white">
          <p className="text-[15px] text-text-2">
            {venueId
              ? "QRコードのジムが見つかりませんでした。下のリストからジムを選んでください。"
              : "スコアを提出するジムを選んでください。ジムの QR コードからも開けます。"}
          </p>
          <div className="mt-6">
            <VenuePicker action="/score" venues={venues} />
          </div>
        </Card>
      </EntryShell>
    );
  }

  const undecided = user.division === UNDECIDED_DIVISION;
  if (undecided || !venue.programs.hasRanking) {
    return (
      <EntryShell eyebrow="Ranking" venue={venue}>
        <Card padding="lg" className="bg-white">
          <p className="font-bold">
            {undecided
              ? "Divisionが未確定のため、まだスコアを提出できません。先に Division Tryout を受けてください。"
              : "このジムでは、いま Ranking を開催していません。"}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={`/entry?venue=${encodeURIComponent(venue.id)}`}>このジムの受付へ</Button>
          </div>
        </Card>
      </EntryShell>
    );
  }

  if (!(await venueCheckIn(venue.id))) {
    return (
      <EntryShell eyebrow="Ranking" venue={venue}>
        <VenueGate venue={venue} program="Ranking" qr={param(sp.qr)} />
      </EntryShell>
    );
  }

  const [points, mine] = await Promise.all([
    getPointMap(CURRENT_SEASON_ID),
    getMyScore(CURRENT_SEASON_ID, user.id, venue.id),
  ]);
  const prefill = parsePrefill(param(sp.prefill));

  return (
    <EntryShell eyebrow="Ranking" venue={venue}>
      <p className="mb-6 text-[15px] text-text-2">
        {user.name} さん ・{" "}
        <span className="font-bold text-text">{divisionName(user.division)}</span>
      </p>
      <div className="mb-6 space-y-3">
        <StatusBanner mine={mine} />
        {prefill.length > 0 && (
          <FormMessage tone="success">
            Tryout で完登した課題（No.{prefill.join("・")}）を選んでおきました。
          </FormMessage>
        )}
      </div>
      <ScoreSheet
        venueId={venue.id}
        points={points}
        initial={mine?.sent ?? []}
        locked={mine?.approved ?? []}
        prefill={prefill}
      />
    </EntryShell>
  );
}

function StatusBanner({ mine }: { mine: MyScore | null }) {
  if (!mine?.status) return null;
  const pt = `${mine.totalPoints.toLocaleString()}pt`;
  if (mine.status === "Rejected") {
    return (
      <FormMessage tone="error">
        前回の提出は差し戻されました。理由：{mine.rejectReason || "店舗で確認してください"}
        。内容を直して、もう一度提出してください。
      </FormMessage>
    );
  }
  const approved = mine.status === "Approved";
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
      <span className={approved ? "font-bold text-[#047857]" : "font-bold text-status-pending"}>
        {approved ? "承認済み" : "承認待ち"}
      </span>
      <span className="ml-2 text-text-2">
        {approved
          ? `${pt}。新しく完登した課題を追加して、もう一度提出できます。`
          : `${pt}。帰る前に店舗スタッフに声をかけてください。内容を直して出し直すこともできます。`}
      </span>
    </div>
  );
}

function ScoreSkeleton() {
  return (
    <main className="bg-bg-subtle px-5 py-12 md:py-20" aria-busy="true">
      <div className="mx-auto max-w-[640px] space-y-4">
        <div className="h-4 w-20 rounded bg-white" />
        <div className="h-9 w-64 rounded bg-white" />
        <div className="mt-8 h-96 rounded-2xl bg-white" />
      </div>
    </main>
  );
}

export default function ScorePage({ searchParams }: PageProps<"/score">) {
  return (
    <Suspense fallback={<ScoreSkeleton />}>
      <Score searchParams={searchParams} />
    </Suspense>
  );
}
