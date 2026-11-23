import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { Suspense } from "react";
import { RoundTabLinks, RoundTabs } from "@/features/tnfc/components/RoundTabs";
import { getRound, ROUND_STATUS } from "@/features/tnfc/queries";
import { requireAdmin } from "@/server/admin-session";

async function RoundHeader({ params }: { params: LayoutProps<"/admin/tnfc/[id]">["params"] }) {
  await requireAdmin();
  const { id } = await params;
  const round = await getRound(id);
  if (!round) notFound();
  const base = `/admin/tnfc/${round.id}`;
  return (
    <>
      <div className="mb-5">
        <p className="font-display text-sm font-bold text-text-3">{round.roundName}</p>
        <h1 className="text-2xl font-bold tracking-tight">{round.venueName}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-2">
          <span>{round.eventDate ? round.eventDate.replaceAll("-", "/") : "日程未定"}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-xs font-bold">
            {ROUND_STATUS[round.status]}
          </span>
          {round.tnfcControlEventUrl && (
            <a
              href={round.tnfcControlEventUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1 font-bold underline underline-offset-4"
            >
              TNFC Control
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          )}
        </p>
      </div>
      <Suspense fallback={<RoundTabLinks base={base} path="" />}>
        <RoundTabs base={base} />
      </Suspense>
    </>
  );
}

export default function RoundLayout({ children, params }: LayoutProps<"/admin/tnfc/[id]">) {
  return (
    <>
      <Link
        href="/admin/tnfc"
        className="mb-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-text-2 hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        予選一覧へ
      </Link>
      <Suspense fallback={<div className="h-28" aria-busy="true" />}>
        <RoundHeader params={params} />
      </Suspense>
      <div className="mt-6">{children}</div>
    </>
  );
}
