import type { Metadata } from "next";
import NextForm from "next/form";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Suspense } from "react";
import { divisionName } from "@/domain/division";
import { PAGE_SIZE, searchMembers } from "@/features/member/queries";
import { requireAdmin } from "@/server/admin-session";

export const metadata: Metadata = { title: "会員" };

type Props = PageProps<"/admin/members">;

async function Results({ searchParams }: { searchParams: Props["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = String(sp.q ?? "");
  const undecided = sp.undecided === "1";
  const page = Math.max(1, Number(sp.page) || 1);
  const { total, rows, failed } = await searchMembers({ q, undecided, page });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) =>
    `/admin/members?${new URLSearchParams({ ...(q && { q }), ...(undecided && { undecided: "1" }), page: String(p) })}`;

  return (
    <div className="space-y-4">
      <NextForm action="/admin/members" className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-text-3"
            aria-hidden
          />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="ライセンスNo.・氏名・フリガナ・メール"
            aria-label="会員を検索"
            className="block min-h-12 w-full rounded-xl border border-line bg-white pr-4 pl-11 text-base hover:border-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text"
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            name="undecided"
            value="1"
            defaultChecked={undecided}
            className="size-5 accent-text"
          />
          Division 未確定のみ
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-full bg-text px-5 text-sm font-bold text-white hover:bg-[#333336]"
        >
          検索
        </button>
      </NextForm>

      {failed ? (
        <p className="rounded-2xl border border-line bg-white p-6 text-sm text-[#b91c1c]">
          会員データを読み込めませんでした。時間をおいて再読み込みしてください。
        </p>
      ) : (
        <>
          <p className="text-sm text-text-3">
            {total.toLocaleString()}件{pages > 1 && `（${page} / ${pages} ページ）`}
          </p>
          {rows.length === 0 ? (
            <p className="rounded-2xl border border-line bg-white p-6 text-sm text-text-3">
              当てはまる会員はいません。
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {rows.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/admin/members/${encodeURIComponent(m.id)}`}
                    className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-bg-subtle/60"
                  >
                    <span className="w-16 shrink-0 font-display font-bold tabular-nums">
                      {m.id}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{m.name || "（氏名なし）"}</span>
                      <span className="block truncate text-xs text-text-3">
                        {m.furigana}
                        {m.email && ` ・ ${m.email}`}
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-sm font-bold">
                      {divisionName(m.division)}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-text-3" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav aria-label="ページ" className="flex justify-between">
              {page > 1 ? (
                <Link
                  href={link(page - 1)}
                  className="min-h-11 px-2 py-3 text-sm font-bold underline underline-offset-4"
                >
                  前のページ
                </Link>
              ) : (
                <span />
              )}
              {page < pages && (
                <Link
                  href={link(page + 1)}
                  className="min-h-11 px-2 py-3 text-sm font-bold underline underline-offset-4"
                >
                  次のページ
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminMembersPage(props: Props) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">会員</h1>
      <p className="mt-2 mb-6 text-sm text-text-2">
        問い合わせのあった選手を探して、登録内容や Division を直せます。
      </p>
      <Suspense fallback={<div className="h-96 rounded-2xl bg-white" aria-busy="true" />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
