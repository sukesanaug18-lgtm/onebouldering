import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeRedirectPath } from "@/domain/member";
import { AuthShell, FormSkeleton } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "ログイン" };

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.redirect) ? sp.redirect[0] : sp.redirect;
  const redirectTo = raw ? safeRedirectPath(raw) : undefined;
  if (await getCurrentUser()) redirect(redirectTo ?? "/mypage");
  return <LoginForm redirectTo={redirectTo} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <AuthShell
      eyebrow="Login"
      title="ログイン"
      lead="ライセンスNo.と4桁の暗証番号でログインします。3つのイベントで共通です。"
      footer={
        <>
          はじめての方は
          <Link href="/register" className="font-bold text-text underline underline-offset-4">
            選手登録（無料）
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
