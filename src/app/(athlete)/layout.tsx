import { Suspense } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileTabBar, MobileTabBarLinks } from "@/components/layout/MobileTabBar";

/** Pages for signed-in athletes. Each page checks the session itself (requireUser). */
export default function AthleteLayout({ children }: LayoutProps<"/">) {
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
