import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";

/** Centered card layout for login / register / PIN reset. */
export function AuthShell({
  eyebrow,
  title,
  lead,
  wide = false,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="bg-bg-subtle px-5 py-16 md:py-24">
      <div className={wide ? "mx-auto max-w-[640px]" : "mx-auto max-w-[440px]"}>
        <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
        {lead && <p className="mt-3 text-[15px] text-text-2">{lead}</p>}
        <Card padding="lg" className="mt-8 bg-white">
          {children}
        </Card>
        {footer && <div className="mt-6 text-center text-sm text-text-2">{footer}</div>}
      </div>
    </main>
  );
}

/** Placeholder while a form that reads the URL loads. */
export function FormSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="space-y-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <div className="h-4 w-24 rounded bg-bg-subtle" />
          <div className="mt-2 h-12 rounded-xl bg-bg-subtle" />
        </div>
      ))}
      <div className="h-13 rounded-full bg-bg-subtle" />
    </div>
  );
}
