/** Placeholder while an editable page is read. */
export function SitePageSkeleton() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-24 md:pt-20" aria-busy="true">
      <div className="h-4 w-20 rounded bg-bg-subtle" />
      <div className="mt-4 h-10 w-2/3 rounded-lg bg-bg-subtle" />
      <div className="mt-6 h-5 w-full rounded bg-bg-subtle" />
      <div className="mt-10 h-96 rounded-2xl bg-bg-subtle" />
    </main>
  );
}
