import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "THE NORTH FACE CUP エントリー",
  description: "THE NORTH FACE CUP 予選会へのエントリー方法。",
};

// Entries are still taken on the current site (with payment); this page sends players there
// until the entry form of this site is built (CLAUDE.md 4: tnfc/apply).
const CURRENT_ENTRY_URL = "https://www.onebouldering.jp/competition-login/12169/";

export default function TnfcApplyPage() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-5 pt-12 pb-24 md:pt-20">
      <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">Entry</p>
      <h1 className="mt-2 text-[clamp(1.8rem,1.3rem+2vw,2.8rem)] leading-tight font-bold tracking-tight">
        予選会にエントリーする
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-text-2">
        THE NORTH FACE CUP のエントリーとお支払いは、いまは ONE bouldering
        公式サイトで受け付けています。ログインして「COMPETITIONS」→「THE NORTH FACE
        CUP」のページからお申し込みください。
      </p>
      <Card padding="lg" className="mt-8 bg-white">
        <ul className="space-y-3 text-[15px] leading-relaxed">
          <li>エントリー費：11,000円（税込）。本戦に進んでも追加の参加費はかかりません。</li>
          <li>締切：各予選会の7日前まで。お支払いも同じ日までにお済ませください。</li>
          <li>予選会へのエントリーは1回のみ。会場は自由に選べます。</li>
          <li>
            Division が決まっていない方は、締切までに{" "}
            <Link href="/tryout/about" className="font-bold underline underline-offset-4">
              Division Tryout
            </Link>{" "}
            を受けてください。
          </li>
        </ul>
        <Button href={CURRENT_ENTRY_URL} size="lg" className="mt-8 w-full">
          公式サイトでエントリーする
        </Button>
      </Card>
      <p className="mt-6 text-sm text-text-2">
        参加条件・本戦出場条件・キャンセルについては{" "}
        <Link href="/rules" className="font-bold underline underline-offset-4">
          ルール・大会要項
        </Link>{" "}
        、日程は{" "}
        <Link href="/schedule" className="font-bold underline underline-offset-4">
          日程・会場
        </Link>{" "}
        をご覧ください。
      </p>
    </main>
  );
}
