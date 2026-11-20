// Setup placeholder. The real top page is built in its own step (CLAUDE.md 7-2).
const EVENTS = [
  { label: "THE NORTH FACE CUP", color: "bg-event-tnfc" },
  { label: "Division Tryout", color: "bg-event-tryout" },
  { label: "ONE bouldering Ranking", color: "bg-event-ranking" },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-5 py-20">
      <p className="font-display text-sm font-semibold tracking-[0.2em] text-text-3 uppercase">
        Setup complete
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-6xl">
        ONE Bouldering
      </h1>
      <p className="mt-6 max-w-[36em] text-text-2">
        初期セットアップが完了しました。ここから共通部品とページを1つずつ作っていきます。
      </p>
      <ul className="mt-10 flex flex-wrap gap-3 text-sm">
        {EVENTS.map((e) => (
          <li
            key={e.label}
            className="flex items-center gap-2 rounded-full border border-line bg-surface-glass px-4 py-2 backdrop-blur-md"
          >
            <span className={`size-2 rounded-full ${e.color}`} aria-hidden />
            <span className="font-display font-medium">{e.label}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
