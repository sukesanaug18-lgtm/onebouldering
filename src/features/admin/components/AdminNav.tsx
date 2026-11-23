"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// Office menu. Items are added as each office screen is built (CLAUDE.md 4: /admin/*).
const ITEMS = [
  { href: "/admin", label: "ダッシュボード", exact: true },
  { href: "/admin/members", label: "会員" },
] as const;

/** Sideways tabs on phones, a vertical list from lg up. */
export function AdminNav() {
  return <AdminNavLinks path={usePathname()} />;
}

/** The menu for a given path. With path "" (Suspense fallback) nothing is marked active. */
export function AdminNavLinks({ path }: { path: string }) {
  return (
    <nav aria-label="事務局メニュー" className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line lg:min-w-0 lg:flex-col lg:border-b-0">
        {ITEMS.map((item) => {
          const active =
            "exact" in item && item.exact ? path === item.href : path.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-11 items-center border-b-2 px-3 text-sm font-bold whitespace-nowrap transition-colors",
                  "lg:mb-0 lg:rounded-lg lg:border-b-0",
                  active
                    ? "border-text text-text lg:bg-white"
                    : "border-transparent text-text-3 hover:text-text-2 lg:hover:bg-white/60",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
