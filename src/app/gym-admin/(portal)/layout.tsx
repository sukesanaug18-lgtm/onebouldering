import { Suspense } from "react";
import { gymLogout } from "@/features/gym/actions";
import { GymTabs } from "@/features/gym/components/GymTabs";
import { requireGym } from "@/server/gym-session";

async function VenueBar() {
  const staff = await requireGym();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          Gym Staff
        </p>
        <p className="truncate text-xl font-bold">{staff.venueName}</p>
      </div>
      <form action={gymLogout}>
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

/** Signed-in gym screens: venue name, logout and the four tabs. Pages check the session too. */
export default function GymPortalLayout({ children }: LayoutProps<"/gym-admin">) {
  return (
    <>
      <header className="bg-white px-5 pt-5">
        <div className="mx-auto max-w-[960px]">
          <Suspense fallback={<div className="h-12" />}>
            <VenueBar />
          </Suspense>
          <div className="mt-3">
            <GymTabs />
          </div>
        </div>
      </header>
      <main className="flex-1 px-5 py-8">
        <div className="mx-auto max-w-[960px]">{children}</div>
      </main>
    </>
  );
}
