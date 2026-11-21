import type { Metadata } from "next";
import { Suspense } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { shortDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { categoryForGender, isUCategory } from "@/domain/tryout";
import { EntryShell } from "@/features/entry/components/EntryShell";
import { VenuePicker } from "@/features/entry/components/VenuePicker";
import { getVenue, param } from "@/features/entry/queries";
import { getVenues } from "@/features/ranking/queries";
import { TryoutForm } from "@/features/tryout/components/TryoutForm";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Division Tryout", robots: { index: false } };

// Division Tryout at a gym (workflow diagram B-2). Reached from the venue QR (/entry).

async function Tryout({ searchParams }: { searchParams: PageProps<"/tryout">["searchParams"] }) {
  const venueId = param((await searchParams).venue);
  const user = await requireUser(
    venueId ? `/tryout?venue=${encodeURIComponent(venueId)}` : "/tryout",
  );
  const venue = await getVenue(venueId);

  if (!venue) {
    const venues = await getVenues();
    return (
      <EntryShell eyebrow="Division Tryout" title="Tryout を受けるジム">
        <Card padding="lg" className="bg-white">
          <p className="text-[15px] text-text-2">
            {venueId
              ? "QRコードのジムが見つかりませんでした。下のリストからジムを選んでください。"
              : "Tryout を受けるジムを選んでください。ジムの QR コードからも開けます。"}
          </p>
          <div className="mt-6">
            <VenuePicker action="/tryout" venues={venues} />
          </div>
        </Card>
      </EntryShell>
    );
  }

  if (isUCategory(user.division) || !venue.programs.hasTryout) {
    return (
      <EntryShell eyebrow="Division Tryout" venue={venue}>
        <Card padding="lg" className="bg-white">
          <p className="font-bold">
            {isUCategory(user.division)
              ? `${user.division} の方は、年齢でカテゴリーが決まるため Tryout はありません。`
              : "このジムでは、いま Division Tryout を開催していません。"}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href={`/entry?venue=${encodeURIComponent(venue.id)}`}>このジムの受付へ</Button>
            <Button href="/tryout/about" variant="secondary">
              Division Tryout について
            </Button>
          </div>
        </Card>
      </EntryShell>
    );
  }

  return (
    <EntryShell eyebrow="Division Tryout" venue={venue}>
      <p className="mb-8 text-[15px] text-text-2">
        {user.name} さん ・ いまのDivision：
        <span className="font-bold text-text">
          {user.division === UNDECIDED_DIVISION ? "未確定" : shortDivision(user.division)}
        </span>
      </p>
      <TryoutForm
        venueId={venue.id}
        fixedCategory={categoryForGender(user.gender)}
        currentDivision={user.division}
      />
    </EntryShell>
  );
}

function TryoutSkeleton() {
  return (
    <main className="bg-bg-subtle px-5 py-12 md:py-20" aria-busy="true">
      <div className="mx-auto max-w-[640px] space-y-4">
        <div className="h-4 w-28 rounded bg-white" />
        <div className="h-9 w-64 rounded bg-white" />
        <div className="mt-8 h-96 rounded-2xl bg-white" />
      </div>
    </main>
  );
}

export default function TryoutPage({ searchParams }: PageProps<"/tryout">) {
  return (
    <Suspense fallback={<TryoutSkeleton />}>
      <Tryout searchParams={searchParams} />
    </Suspense>
  );
}
