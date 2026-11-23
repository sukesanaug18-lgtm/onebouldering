import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "店舗スタッフ画面", template: "%s | 店舗スタッフ画面" },
  robots: { index: false, follow: false },
};

/** Gym staff screens (workflow diagram B-3). No public header; staff work on a phone or tablet. */
export default function GymAdminRoot({ children }: LayoutProps<"/gym-admin">) {
  return <div className="flex flex-1 flex-col bg-bg-subtle">{children}</div>;
}
