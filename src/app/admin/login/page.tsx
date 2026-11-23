import type { Metadata } from "next";
import { Logo } from "@/components/layout/Logo";
import { Card } from "@/components/ui/Card";
import { AdminLoginForm } from "@/features/admin/components/AdminLoginForm";

export const metadata: Metadata = { title: "ログイン" };

export default function AdminLoginPage() {
  return (
    <main className="px-5 py-12 md:py-20">
      <div className="mx-auto max-w-[440px]">
        <Logo />
        <p className="mt-10 font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          Office
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">事務局画面</h1>
        <p className="mt-3 text-[15px] text-text-2">
          運営事務局のアカウントでログインしてください。アカウントの追加は管理者が行います。
        </p>
        <Card padding="lg" className="mt-8 bg-white">
          <AdminLoginForm />
        </Card>
      </div>
    </main>
  );
}
