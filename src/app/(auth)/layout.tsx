import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileTabBar, MobileTabBarLinks } from "@/components/layout/MobileTabBar";

/** Login / register / PIN reset: same frame as public pages (CLAUDE.md 4). */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
      <Suspense fallback={<MobileTabBarLinks pathname="" />}>
        <MobileTabBar />
      </Suspense>
    </>
  );
}
