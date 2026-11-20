import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FadeIn } from "@/components/motion/FadeIn";

// Dev-only catalog of the shared parts. Returns 404 in production builds.
export const metadata: Metadata = { title: "共通部品プレビュー" };

const EVENTS = [
  {
    accent: "tnfc",
    name: "THE NORTH FACE CUP",
    text: "年に一度の全国大会。予選から決勝まで、ここからエントリーできます。",
  },
  {
    accent: "tryout",
    name: "Division Tryout",
    text: "参加ジムで課題に挑戦して、自分のディビジョンを決めましょう。",
  },
  {
    accent: "ranking",
    name: "ONE bouldering Ranking",
    text: "大会の成績がポイントになり、全国のランキングに反映されます。",
  },
] as const;

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 py-20 md:py-32">
      <p className="font-display text-sm font-bold tracking-[0.2em] text-text-3 uppercase">
        Components
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
        共通部品プレビュー
      </h1>

      <section className="mt-16" aria-labelledby="buttons">
        <h2 id="buttons" className="text-xl font-bold">
          ボタン
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button href="/preview">エントリーする</Button>
          <Button href="/preview" variant="secondary">
            大会の詳細
          </Button>
          <Button href="/preview" variant="text">
            すべてのお知らせ
          </Button>
          <Button href="https://example.com" variant="secondary">
            TNFC Control へ
          </Button>
          <Button disabled>受付終了</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button size="lg">大きいメイン</Button>
          <Button size="lg" variant="secondary">
            大きいサブ
          </Button>
        </div>
      </section>

      <section className="mt-20" aria-labelledby="cards">
        <h2 id="cards" className="text-xl font-bold">
          カード（スクロールでフェードイン、0.06秒ずつずらす）
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {EVENTS.map((e, i) => (
            <FadeIn as="li" key={e.name} delay={i * 0.06}>
              <Card accent={e.accent} interactive className="flex h-full flex-col">
                <h3 className="font-display text-lg font-bold">{e.name}</h3>
                <p className="mt-3 flex-1 text-[15px] text-text-2">{e.text}</p>
                <Button href="/preview" variant="text" className="mt-4 self-start">
                  詳しく見る
                </Button>
              </Card>
            </FadeIn>
          ))}
        </ul>
      </section>

      <div className="h-[60vh]" aria-hidden />

      <FadeIn>
        <Card padding="lg" className="bg-bg-subtle/70">
          <h2 className="text-xl font-bold">下までスクロールすると表示されるカード</h2>
          <p className="mt-3 text-text-2">
            画面に入ったときに一度だけ、下から20pxふわっと出ます。動きを減らす設定の人には動きなしで表示します。
          </p>
        </Card>
      </FadeIn>
    </main>
  );
}
