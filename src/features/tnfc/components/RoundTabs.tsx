"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const tabs = (base: string) => [
  { href: base, label: "大会情報" },
  { href: `${base}/entries`, label: "エントリー" },
  { href: `${base}/checks`, label: "締切前チェック" },
  { href: `${base}/bibs`, label: "ゼッケン・CSV" },
];

/** The four steps of diagram B-4 for one round. */
export function RoundTabs({ base }: { base: string }) {
  return <RoundTabLinks base={base} path={usePathname()} />;
}

export function RoundTabLinks({ base, path }: { base: string; path: string }) {
  return (
    <nav aria-label="大会のメニュー" className="-mx-5 overflow-x-auto px-5 lg:mx-0 lg:px-0">
      <ul className="flex min-w-max gap-1 border-b border-line">
        {tabs(base).map((t) => {
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
