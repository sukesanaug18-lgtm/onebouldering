import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { UNDECIDED_DIVISION } from "@/domain/division";
import {
  Competitions,
  TnfcEntries,
  TryoutHistory,
} from "@/features/mypage/components/HistorySections";
import { LicenseCard } from "@/features/mypage/components/LicenseCard";
import { MyRanking } from "@/features/mypage/components/MyRanking";
import { SectionSkeleton } from "@/features/mypage/components/MySection";
import { Notifications } from "@/features/mypage/components/Notifications";
import { ProfileSection } from "@/features/mypage/components/ProfileSection";
import { CURRENT_SEASON_ID } from "@/lib/season";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "マイページ", robots: { index: false } };

// My page (workflow diagram B-2): license, notices, Ranking, Tryout history, TNFC and
// official competitions for the current season. Each block streams in on its own.

async function MyPageContent() {
  const user = await requireUser("/mypage");
  const season = CURRENT_SEASON_ID;
  const undecided = user.division === UNDECIDED_DIVISION;

  return (
    <div className="space-y-10">
      <LicenseCard user={user} seasonId={season} />
      {undecided && (
        <div className="rounded-2xl border border-l-4 border-line border-l-event-tryout bg-white p-5">
          <p className="font-bold">次は Division Tryout を受けましょう</p>
          <p className="mt-1 text-sm text-text-2">
            参加ジムの QR コードを読むと受けられます。Divisionが決まると、Ranking と THE NORTH FACE
            CUP に参加できます。
          </p>
          <Button href="/tryout/about" variant="text" className="mt-2">
            Division Tryout について
          </Button>
        </div>
      )}
      <Suspense fallback={null}>
        <Notifications userId={user.id} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <MyRanking userId={user.id} division={user.division} seasonId={season} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <TryoutHistory userId={user.id} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <TnfcEntries userId={user.id} seasonId={season} />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Competitions userId={user.id} seasonId={season} />
      </Suspense>
      <ProfileSection user={user} />
    </div>
  );
}

export default function MyPage() {
  return (
    <main className="bg-bg-subtle px-5 py-12 md:py-20">
      <div className="mx-auto max-w-[720px]">
        <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          My Page
        </p>
        <h1 className="mt-2 mb-8 text-3xl font-bold tracking-tight">マイページ</h1>
        <Suspense fallback={<div className="h-56 rounded-2xl bg-white" aria-busy="true" />}>
          <MyPageContent />
        </Suspense>
      </div>
    </main>
  );
}
