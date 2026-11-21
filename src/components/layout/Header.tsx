import { Suspense } from "react";
import { HeaderAccount } from "./HeaderAccount";
import { Logo } from "./Logo";
import { MainNav } from "./MainNav";
import { MobileMenu } from "./MobileMenu";

/**
 * Site header: sticky, frosted white with a 1px bottom line (CLAUDE.md 6-2).
 * Desktop shows the main links; smaller screens use the menu button.
 * The login state streams in behind Suspense so the rest of the header stays static.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
        <Logo priority />
        <MainNav />
        <div className="flex items-center gap-2">
          <div className="hidden min-w-[11rem] items-center justify-end gap-1 lg:flex">
            <Suspense fallback={null}>
              <HeaderAccount variant="desktop" />
            </Suspense>
          </div>
          <MobileMenu
            account={
              <Suspense fallback={<div className="h-11" />}>
                <HeaderAccount variant="menu" />
              </Suspense>
            }
          />
        </div>
      </div>
    </header>
  );
}
