import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { PasswordEmailForm } from "@/features/admin/components/StaffForms";

export const metadata: Metadata = { title: "パスワードの設定" };

export default function AdminPasswordPage() {
  return (
    <main className="px-5 py-12 md:py-20">
      <div className="mx-auto max-w-[440px]">
        <Logo />
        <p className="mt-10 font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          Office
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">パスワードの設定</h1>
        <p className="mt-3 text-[15px] text-text-2">
          はじめての方・パスワードを忘れた方は、事務局に登録されたメールアドレスを入れてください。パスワードを決めるためのメールが届きます。
        </p>
        <Card padding="lg" className="mt-8 bg-white">
          <PasswordEmailForm />
        </Card>
        <Link
          href="/admin/login"
          className="mt-6 inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
        >
          ログイン画面に戻る
        </Link>
      </div>
    </main>
  );
}
