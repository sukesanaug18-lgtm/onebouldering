import { Button } from "@/components/ui/Button";
import { Logo } from "./Logo";
import { MainNav } from "./MainNav";
import { MobileMenu } from "./MobileMenu";

/**
 * Site header: sticky, frosted white with a 1px bottom line (CLAUDE.md 6-2).
 * Desktop shows the main links; smaller screens use the menu button.
 * Logged-in state (my page link) is added in the auth step.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5">
        <Logo priority />
        <MainNav />
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            <Button href="/login" variant="text" arrow={false} className="px-3 text-[14px]">
              ログイン
            </Button>
            <Button href="/register" variant="secondary" className="px-5 text-[14px]">
              選手登録
            </Button>
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
