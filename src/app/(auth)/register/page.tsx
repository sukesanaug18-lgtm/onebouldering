import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { safeRedirectPath } from "@/domain/member";
import { AuthShell, FormSkeleton } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = { title: "選手登録" };

async function RegisterContent({
  searchParams,
}: {
  searchParams: PageProps<"/register">["searchParams"];
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.redirect) ? sp.redirect[0] : sp.redirect;
  return <RegisterForm redirectTo={raw ? safeRedirectPath(raw) : undefined} />;
}

export default function RegisterPage({ searchParams }: PageProps<"/register">) {
  return (
    <AuthShell
      wide
      eyebrow="Sign up"
      title="選手登録"
      lead="無料で登録できます。ひとつのライセンスNo.で、THE NORTH FACE CUP・Division Tryout・Ranking に参加できます。"
      footer={
        <>
          登録済みの方は
          <Link href="/login" className="font-bold text-text underline underline-offset-4">
            ログイン
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton rows={6} />}>
        <RegisterContent searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
