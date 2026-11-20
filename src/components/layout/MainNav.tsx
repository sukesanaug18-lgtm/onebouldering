"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAIN_NAV, isActivePath } from "@/content/navigation";
import { cn } from "@/lib/cn";

/** Desktop header links with the current page marked. */
export function MainNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="メインメニュー" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {MAIN_NAV.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-3.5 font-display text-[14px] font-bold whitespace-nowrap outline-offset-2 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-text",
                  active ? "bg-bg-subtle text-text" : "text-text-2 hover:text-text",
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
