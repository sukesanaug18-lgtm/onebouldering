import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "事務局画面", template: "%s | 事務局画面" },
  robots: { index: false, follow: false },
};

/** Office screens (workflow diagrams B-4 to B-8). No public header. */
export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return <div className="flex flex-1 flex-col bg-bg-subtle">{children}</div>;
}
