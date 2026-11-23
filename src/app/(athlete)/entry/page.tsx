import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ClipboardCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/Field";
import { divisionName, UNDECIDED_DIVISION } from "@/domain/division";
import { decideEntry, type EntryOption } from "@/domain/entry";
import { EntryShell } from "@/features/entry/components/EntryShell";
import { VenuePicker } from "@/features/entry/components/VenuePicker";
import { getVenue, param, type VenueDetail } from "@/features/entry/queries";
import { getPublicVenues } from "@/features/ranking/queries";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "会場エントリー", robots: { index: false } };

// Unified venue QR (CLAUDE.md 5, workflow diagram B-2): one QR per gym.
// Looks at the login state, the player's Division and the gym's programs,
// and sends the player to Tryout or Ranking.

const PATHS: Record<EntryOption["kind"], string> = { tryout: "/tryout", score: "/score" };

async function Entry({ searchParams }: { searchParams: PageProps<"/entry">["searchParams"] }) {
  const sp = await searchParams;
  const venueId = param(sp.venue);
  const qr = param(sp.qr) === "error" ? "error" : param(sp.qr) ? "invalid" : undefined;
  const venue = await getVenue(venueId);
  if (!venue) return <NoVenue unknown={Boolean(venueId)} />;

  const here = `/entry?venue=${encodeURIComponent(venue.id)}`;
  const user = await getCurrentUser();
  const decision = decideEntry({
    loggedIn: Boolean(user),
    division: user?.division,
    programs: venue.programs,
  });

  // A single destination: go straight there, as the QR promises.
  if (decision.kind === "choose" && decision.options.length === 1) {
    const q = qr ? `&qr=${qr}` : "";
    redirect(`${PATHS[decision.options[0].kind]}?venue=${encodeURIComponent(venue.id)}${q}`);
  }

  return (
    <EntryShell eyebrow="Check-in" venue={venue}>
      {qr && decision.kind === "choose" && (
        <div className="mb-4">
          <FormMessage tone="error">
            この QR コードは使えません。ジムに貼ってある最新の QR
            コードを読むか、次の画面で位置情報で確認してください。
          </FormMessage>
        </div>
      )}
      {decision.kind === "login" && <LoginFirst returnTo={here} />}
      {decision.kind === "needs-tryout-elsewhere" && <NeedsTryout />}
      {decision.kind === "nothing" && (
        <Card className="bg-white">
          <p className="font-bold">このジムで受けられるプログラムはありません。</p>
          <p className="mt-2 text-sm text-text-2">開催期間は日程ページで確認できます。</p>
          <Button href="/schedule" variant="text" className="mt-4">
            日程を見る
          </Button>
        </Card>
      )}
      {decision.kind === "choose" && user && (
        <div className="space-y-4">
          <p className="text-[15px] text-text-2">
            {user.name} さん（
            {user.division === UNDECIDED_DIVISION ? "Division 未確定" : divisionName(user.division)}
            ）。参加するプログラムを選んでください。
          </p>
          {decision.options.map((o) => (
            <ProgramCard key={o.kind} option={o} venue={venue} />
          ))}
        </div>
      )}
    </EntryShell>
  );
}

function ProgramCard({ option, venue }: { option: EntryOption; venue: VenueDetail }) {
  const href = `${PATHS[option.kind]}?venue=${encodeURIComponent(venue.id)}`;
  const isScore = option.kind === "score";
  const Icon = isScore ? Trophy : ClipboardCheck;
  return (
    <Card accent={isScore ? "ranking" : "tryout"} className="bg-white">
      <div className="flex items-start gap-4">
        <Icon className="mt-1 size-6 shrink-0 text-text-2" aria-hidden />
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            {isScore ? "Ranking のスコアを提出する" : "Division Tryout を受ける"}
          </h2>
          <p className="mt-1 text-sm text-text-2">
            {isScore
              ? "40課題のうち完登した課題を選んで提出します。帰る前にスタッフに声をかけてください。"
              : "指定の6課題に挑戦して、Divisionを決め直します。結果はすぐに反映されます。"}
          </p>
          <Button
            href={href}
            variant={option.recommended ? "primary" : "secondary"}
            className="mt-4"
          >
            {isScore ? "スコアを提出する" : "Tryout を受ける"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function LoginFirst({ returnTo }: { returnTo: string }) {
  const next = encodeURIComponent(returnTo);
  return (
    <Card padding="lg" className="bg-white">
      <h2 className="text-lg font-bold">まずはログインしてください</h2>
      <p className="mt-2 text-[15px] text-text-2">
        ログインすると、このジムで参加できる Division Tryout や Ranking に進めます。
        はじめての方は、無料の選手登録から始めてください。
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button href={`/login?redirect=${next}`} size="lg">
          ログイン
        </Button>
        <Button href={`/register?redirect=${next}`} size="lg" variant="secondary">
          選手登録（無料）
        </Button>
      </div>
    </Card>
  );
}

function NeedsTryout() {
  return (
    <Card accent="tryout" padding="lg" className="bg-white">
      <h2 className="text-lg font-bold">先に Division Tryout を受けてください</h2>
      <p className="mt-2 text-[15px] text-text-2">
        Divisionが未確定のため、Ranking のスコアはまだ提出できません。 このジムでは Tryout
        を開催していないので、開催しているジムで受けてください。
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/schedule">Tryout を開催しているジム</Button>
        <Button href="/tryout/about" variant="secondary">
          Division Tryout について
        </Button>
      </div>
    </Card>
  );
}

async function NoVenue({ unknown }: { unknown: boolean }) {
  const venues = await getPublicVenues();
  return (
    <EntryShell eyebrow="Check-in" title="会場エントリー">
      <Card padding="lg" className="bg-white">
        <p className="text-[15px] text-text-2">
          {unknown
            ? "QRコードのジムが見つかりませんでした。下のリストからジムを選んでください。"
            : "ジムに置いてある QR コードを読むと、そのジムのプログラムに進めます。QR が読めないときは、下のリストからジムを選んでください。"}
        </p>
        <div className="mt-6">
          <VenuePicker action="/entry" venues={venues} />
        </div>
      </Card>
    </EntryShell>
  );
}

function EntrySkeleton() {
  return (
    <main className="bg-bg-subtle px-5 py-12 md:py-20" aria-busy="true">
      <div className="mx-auto max-w-[640px] space-y-4">
        <div className="h-4 w-20 rounded bg-white" />
        <div className="h-9 w-64 rounded bg-white" />
        <div className="mt-8 h-48 rounded-2xl bg-white" />
      </div>
    </main>
  );
}

export default function EntryPage({ searchParams }: PageProps<"/entry">) {
  return (
    <Suspense fallback={<EntrySkeleton />}>
      <Entry searchParams={searchParams} />
    </Suspense>
  );
}
