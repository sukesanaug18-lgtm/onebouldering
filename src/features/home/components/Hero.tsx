import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Phrase } from "@/components/ui/Phrase";

/**
 * Top hero (CLAUDE.md 5-1). Dark, as on the current site.
 * A competition photo can be placed behind it later (dark glass over the photo).
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0b0b0d] text-white">
      <div className="mx-auto max-w-[1200px] px-5 pt-20 pb-24 md:pt-32 md:pb-36">
        <ul className="flex flex-wrap gap-2" aria-label="3つのイベント">
          <li>
            <Badge tone="dark" event="tnfc">
              THE NORTH FACE CUP
            </Badge>
          </li>
          <li>
            <Badge tone="dark" event="tryout">
              Division Tryout
            </Badge>
          </li>
          <li>
            <Badge tone="dark" event="ranking">
              ONE bouldering Ranking
            </Badge>
          </li>
        </ul>
        <h1 className="mt-8 max-w-[14em] text-[clamp(2.25rem,1.4rem+3.6vw,4.5rem)] leading-[1.15] font-bold tracking-tight">
          <Phrase>3つのイベントに、</Phrase>
          <br />
          <Phrase>ひとつの入口。</Phrase>
        </h1>
        <p className="mt-6 max-w-[34em] text-white/70 md:text-lg">
          <Phrase>
            選手登録はひとつ。Division Tryout のクラスも、Ranking のスコアも、THE NORTH FACE CUP
            の結果も、すべてつながります。
          </Phrase>
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/join" variant="inverse" size="lg">
            はじめての方へ
          </Button>
          <Button href="/schedule" variant="glass" size="lg">
            日程を見る
          </Button>
        </div>
      </div>
    </section>
  );
}
