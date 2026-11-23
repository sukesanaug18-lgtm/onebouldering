import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { FormSkeleton } from "@/features/auth/components/AuthShell";
import { GymLoginForm } from "@/features/gym/components/GymLoginForm";
import { getVenues } from "@/features/ranking/queries";

export const metadata: Metadata = { title: "ログイン" };

async function VenueLogin() {
  const venues = await getVenues();
  return <GymLoginForm venues={venues} />;
}

export default function GymLoginPage() {
  return (
    <main className="px-5 py-12 md:py-20">
      <div className="mx-auto max-w-[440px]">
        <Logo />
        <p className="mt-10 font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          For Gym Staff
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">店舗スタッフ画面</h1>
        <p className="mt-3 text-[15px] text-text-2">
          Ranking スコアの承認、Tryout
          履歴の確認ができます。パスワードは事務局からお知らせしています。
        </p>
        <Card padding="lg" className="mt-8 bg-white">
          <Suspense fallback={<FormSkeleton />}>
            <VenueLogin />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
