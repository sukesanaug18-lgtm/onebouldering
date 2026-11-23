"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Flag, House, UserRound } from "lucide-react";
import { TAB_NAV, isActivePath } from "@/content/navigation";
import { cn } from "@/lib/cn";

const ICONS = { home: House, events: Flag, schedule: CalendarDays, user: UserRound };

/** Bottom tabs on phones and tablets (CLAUDE.md 6-8). Hidden from lg up. */
export function MobileTabBar() {
  return <MobileTabBarLinks pathname={usePathname()} />;
}

/** The tabs for a given path. With "" (Suspense fallback) nothing is marked. */
export function MobileTabBarLinks({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="タブメニュー"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-4">
        {TAB_NAV.map((tab) => {
          const Icon = ICONS[tab.icon];
          const active = isActivePath(pathname, tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-bold outline-offset-[-2px] transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-text",
                  active ? "text-text" : "text-text-3 hover:text-text-2",
                )}
              >
                <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
