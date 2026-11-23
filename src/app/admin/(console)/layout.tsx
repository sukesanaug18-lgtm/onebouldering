import { Suspense } from "react";
import { adminLogout } from "@/features/admin/actions";
import { AdminNav, AdminNavLinks } from "@/features/admin/components/AdminNav";
import { requireAdmin } from "@/server/admin-session";

async function StaffBar() {
  const admin = await requireAdmin();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden truncate text-sm text-text-3 sm:inline">{admin.email}</span>
      <form action={adminLogout}>
        <button
          type="submit"
          className="min-h-11 px-2 text-sm font-bold whitespace-nowrap text-text-2 underline underline-offset-4 hover:text-text"
        >
          ログアウト
        </button>
      </form>
    </div>
  );
}

/** Signed-in office screens: top bar, menu (tabs on phones, side list on desktop). */
export default function AdminConsoleLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="bg-white px-5 pt-4 lg:pb-4 print:hidden">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <div>
            <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
              ONE Bouldering Office
            </p>
            <p className="text-xl font-bold">事務局画面</p>
          </div>
          <Suspense fallback={<div className="h-11" />}>
            <StaffBar />
          </Suspense>
        </div>
        <div className="mx-auto mt-3 max-w-[1200px] lg:hidden">
          <Suspense fallback={<AdminNavLinks path="" />}>
            <AdminNav />
          </Suspense>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 gap-8 px-5 py-8 print:block print:max-w-none print:p-0">
        <aside className="hidden w-48 shrink-0 lg:block print:hidden">
          <div className="sticky top-6">
            <Suspense fallback={<AdminNavLinks path="" />}>
              <AdminNav />
            </Suspense>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </>
  );
}
