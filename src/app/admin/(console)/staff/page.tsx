import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { AddStaffForm, StaffRowActions } from "@/features/admin/components/StaffForms";
import { listStaff } from "@/features/admin/staff";
import { shortDate } from "@/features/mypage/components/MySection";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "事務局メンバー" };

async function StaffList() {
  const me = await requireAdmin();
  const rows = await listStaff();
  return (
    <ul className="divide-y divide-line">
      {rows.map((r) => (
        <li key={r.uid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="font-bold break-all">
              {r.email}
              {r.uid === me.uid && <span className="ml-2 text-sm text-text-3">（あなた）</span>}
            </p>
            <p className="text-sm text-text-3">
              {r.hasPassword ? "パスワード設定済み" : "パスワード未設定（メール待ち）"}
              {r.hasPassword &&
                r.lastSignIn &&
                ` ・ 最終ログイン ${shortDate(new Date(r.lastSignIn).toISOString())}`}
            </p>
          </div>
          <StaffRowActions uid={r.uid} email={r.email} isSelf={r.uid === me.uid} />
        </li>
      ))}
    </ul>
  );
}

export default function AdminStaffPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">事務局メンバー</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        事務局画面にログインできる人です。メールアドレスを追加すると、その人にパスワード設定のメールが届きます。
      </p>
      <Card className="mb-6 bg-white">
        <AddStaffForm />
      </Card>
      <Card className="bg-white">
        <Suspense fallback={<div className="h-40" aria-busy="true" />}>
          <StaffList />
        </Suspense>
      </Card>
    </>
  );
}
