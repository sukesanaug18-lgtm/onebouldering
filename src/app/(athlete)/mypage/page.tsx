import type { Metadata } from "next";
import { Suspense } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { shortDivision, UNDECIDED_DIVISION } from "@/domain/division";
import { logout } from "@/features/auth/actions";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "マイページ", robots: { index: false } };

// Minimal my page for the auth step. The full page (Tryout history, Ranking, TNFC entries)
// is built in its own step (CLAUDE.md 7-2).

async function Profile() {
  const user = await requireUser("/mypage");
  const undecided = user.division === UNDECIDED_DIVISION;
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">{user.name} さん</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-text-3">ライセンスNo.</p>
          <p className="mt-1 font-display text-3xl font-extrabold tabular-nums">{user.id}</p>
        </Card>
        <Card accent="tryout">
          <p className="text-sm text-text-3">Division</p>
          <p className="mt-1 font-display text-3xl font-extrabold">
            {undecided ? "未確定" : shortDivision(user.division)}
          </p>
          {undecided && (
            <p className="mt-2 text-sm text-text-2">
              参加ジムで Division Tryout を受けると決まります。
            </p>
          )}
        </Card>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        {undecided && <Button href="/tryout/about">Division Tryout について</Button>}
        <form action={logout}>
          <Button type="submit" variant="secondary">
            ログアウト
          </Button>
        </form>
      </div>
    </>
  );
}

export default function MyPage() {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-16 md:py-24">
      <Badge>マイページ</Badge>
      <div className="mt-4">
        <Suspense fallback={<div className="h-64 rounded-2xl bg-bg-subtle" aria-busy="true" />}>
          <Profile />
        </Suspense>
      </div>
    </main>
  );
}
