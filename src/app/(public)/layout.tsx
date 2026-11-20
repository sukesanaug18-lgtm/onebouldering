import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

/** Public pages: header, footer and the phone bottom tabs (CLAUDE.md 4). */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
      <MobileTabBar />
    </>
  );
}
