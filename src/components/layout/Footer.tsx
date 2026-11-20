import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { GYM_NAV, MENU_GROUPS } from "@/content/navigation";
import { SITE_NAME } from "@/lib/site";
import { Logo } from "./Logo";

/** Site footer: logo, grouped links, gym link, copyright. */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-bg-subtle pb-24 lg:pb-0">
      <div className="mx-auto max-w-[1200px] px-5 py-16">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[22em] text-sm text-text-2">
              THE NORTH FACE CUP、Division Tryout、ONE bouldering Ranking をひとつのサイトで。
            </p>
          </div>
          <nav aria-label="フッターメニュー" className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {MENU_GROUPS.map((group) => (
              <section key={group.title}>
                <h2 className="font-display text-xs font-bold tracking-[0.15em] text-text-3 uppercase">
                  {group.title}
                </h2>
                <ul className="mt-3 space-y-1">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 items-center gap-1 text-sm text-text-2 transition-colors duration-200 hover:text-text"
                        >
                          {item.label}
                          <ExternalLink className="size-3.5" aria-hidden />
                          <span className="sr-only">（新しいタブで開きます）</span>
                        </a>
                      ) : (
                        <Link
                          href={item.href}
                          className="inline-flex min-h-9 items-center text-sm text-text-2 transition-colors duration-200 hover:text-text"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 text-xs text-text-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © <span className="nowrap-token">{SITE_NAME}</span>
          </p>
          <ul className="flex flex-wrap gap-x-6">
            {GYM_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-9 items-center transition-colors duration-200 hover:text-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
