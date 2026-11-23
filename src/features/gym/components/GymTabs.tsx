"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/gym-admin", label: "承認待ち" },
  { href: "/gym-admin/approved", label: "承認済み" },
  { href: "/gym-admin/tryouts", label: "Tryout 履歴" },
  { href: "/gym-admin/stats", label: "集計" },
] as const;

/** The four work tabs of diagram B-3. Scrolls sideways on narrow phones. */
export function GymTabs() {
  const path = usePathname();
  return (
    <nav aria-label="店舗メニュー" className="-mx-5 overflow-x-auto px-5">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {TABS.map((t) => {
          const active = path === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm font-bold whitespace-nowrap transition-colors",
                  active
                    ? "border-text text-text"
                    : "border-transparent text-text-3 hover:text-text-2",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
