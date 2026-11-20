import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, QrCode, ShieldCheck, Smartphone, UserRoundPlus } from "lucide-react";
import { FadeIn } from "@/components/motion/FadeIn";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Phrase } from "@/components/ui/Phrase";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "はじめての方へ",
  description:
    "ONE Bouldering の3つのイベントに参加するまでの流れ。選手登録、Division Tryout、Ranking と THE NORTH FACE CUP への参加方法をまとめています。",
};

// Goal: a first-timer knows what to do first within 30 seconds (CLAUDE.md 1).

const FIRST_STEPS = [
  {
    no: "01",
    title: "選手登録",
    text: "無料で登録します。ライセンスNo.と4桁のPINでログインします。",
    href: "/register",
    link: "登録する",
  },
  {
    no: "02",
    title: "Division Tryout",
    text: "参加ジムで指定の6課題に挑戦して、自分のクラスを決めます。",
    href: "/tryout/about",
    link: "Tryout について",
  },
  {
    no: "03",
    title: "Ranking・TNFC に参加",
    text: "ジムの40課題でスコアを集めたり、全国大会に出場したりします。",
    href: "/ranking/about",
    link: "Ranking について",
  },
];

const COMPARE = {
  head: ["", "Division Tryout", "ONE bouldering Ranking", "THE NORTH FACE CUP"],
  rows: [
    [
      "何をする",
      "指定の6課題に挑戦してクラスを決める",
      "40課題でスコアを集めて順位を競う",
      "予選から本戦まで勝ち進む大会",
    ],
    ["どこで", "参加ジム", "参加ジム", "予選会場・本戦会場"],
    ["いつ", "いつでも", "各ジムの開催期間中", "予選・本戦の開催日"],
    ["申し込み", "不要（会場のQRから）", "不要（会場のQRから）", "このサイトでエントリー"],
    ["結果", "その場で決定", "店舗スタッフの承認で確定", "当日 TNFC Control で発表"],
  ],
};

const AT_GYM = [
  {
    icon: QrCode,
    title: "会場のQRを読む",
    text: "参加ジムに置いてあるQRコードをスマホで読みます。QRは1種類だけです。",
  },
  {
    icon: Smartphone,
    title: "ログイン",
    text: "ライセンスNo.とPINでログインします。未登録ならその場で登録できます。",
  },
  {
    icon: UserRoundPlus,
    title: "自動で案内",
    text: "Divisionが未確定なら Tryout へ、決まっていれば Ranking へ自動で進みます。",
  },
  {
    icon: ShieldCheck,
    title: "スタッフの承認（Ranking）",
    text: "Ranking のスコアは、帰る前に店舗スタッフの承認を受けると確定します。",
  },
];

const FAQ = [
  {
    q: "クライミングをはじめたばかりでも参加できますか？",
    a: "はい。Division Tryout で自分に合ったクラスが決まるので、同じくらいのレベルの人と競えます。",
  },
  {
    q: "お金はかかりますか？",
    a: "選手登録は無料です。Ranking の参加費も無料で、ジムの施設利用料のみかかります。THE NORTH FACE CUP はエントリー時に参加費のお支払いがあります。",
  },
  {
    q: "子どもも参加できますか？",
    a: "はい。生年月日からUカテゴリー（U-8〜U-15）が自動で決まります。",
  },
  {
    q: "PINを忘れました。",
    a: "ログイン画面の「PINを忘れた方」から再設定できます。",
  },
];

export default function JoinPage() {
  return (
    <main>
      {/* First view: the 3 things to do */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1200px] px-5 pt-16 pb-20 md:pt-24 md:pb-28">
          <p className="font-display text-xs font-bold tracking-[0.2em] text-text-3 uppercase">
            Getting started
          </p>
          <h1 className="mt-3 text-[clamp(2rem,1.4rem+2.6vw,3.5rem)] leading-[1.2] font-bold tracking-tight">
            <Phrase>はじめての方へ</Phrase>
          </h1>
          <p className="mt-5 max-w-[34em] text-text-2 md:text-lg">
            <Phrase>
              選手登録はひとつで、3つのイベントすべてに参加できます。最初にやることは、この3つです。
            </Phrase>
          </p>

          <ol className="mt-12 grid gap-4 md:grid-cols-3">
            {FIRST_STEPS.map((s) => (
              <li key={s.no}>
                <Card interactive padding="lg" className="flex h-full flex-col">
                  <span className="font-display text-5xl font-extrabold tracking-tight text-line [-webkit-text-stroke:1px_var(--color-text-3)]">
                    {s.no}
                  </span>
                  <h2 className="mt-4 text-xl font-bold">
                    <Link
                      href={s.href}
                      className="outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-text"
                    >
                      {s.title}
                    </Link>
                  </h2>
                  <p className="mt-3 flex-1 text-[15px] text-text-2">{s.text}</p>
                  <span
                    className="mt-6 inline-flex items-center gap-1 font-display text-[15px] font-bold"
                    aria-hidden
                  >
                    {s.link}
                    <ChevronRight className="size-4" />
                  </span>
                </Card>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="/register" size="lg">
              選手登録（無料）
            </Button>
            <Button href="/login" variant="secondary" size="lg">
              登録済みの方はログイン
            </Button>
          </div>
        </div>
      </section>

      {/* Compare the 3 events */}
      <Section tone="subtle" aria-labelledby="compare-title">
        <SectionHeading
          id="compare-title"
          eyebrow="Compare"
          title="3つのイベントのちがい"
          description="どれも同じ選手登録で参加できます。"
        />
        <FadeIn className="mt-10">
          {/* PC: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-white/70 backdrop-blur-md md:block">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-line">
                  {COMPARE.head.map((h, i) => (
                    <th key={h || "label"} scope="col" className="px-6 py-4 align-bottom">
                      {i === 0 ? (
                        <span className="sr-only">項目</span>
                      ) : (
                        <Badge event={(["tryout", "ranking", "tnfc"] as const)[i - 1]}>{h}</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {COMPARE.rows.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row" className="w-32 px-6 py-4 text-sm font-bold text-text-3">
                      {label}
                    </th>
                    {cells.map((c, i) => (
                      <td key={i} className="px-6 py-4 text-text-2">
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Phone: one card per event */}
          <div className="grid gap-4 md:hidden">
            {COMPARE.head.slice(1).map((name, ei) => (
              <Card key={name}>
                <Badge event={(["tryout", "ranking", "tnfc"] as const)[ei]}>{name}</Badge>
                <dl className="mt-4 divide-y divide-line">
                  {COMPARE.rows.map(([label, ...cells]) => (
                    <div key={label} className="flex gap-4 py-3">
                      <dt className="w-20 shrink-0 text-sm font-bold text-text-3">{label}</dt>
                      <dd className="text-[15px] text-text-2">{cells[ei]}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            ))}
          </div>
        </FadeIn>
      </Section>

      {/* What is a Division */}
      <Section aria-labelledby="division-title">
        <SectionHeading
          id="division-title"
          eyebrow="Division"
          title="Divisionとは"
          description="実力に合わせたクラスのことです。数字が小さいほど上のクラスになります。Ranking と THE NORTH FACE CUP は、Divisionごとに順位を決めます。"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { title: "Men's", items: ["MD1", "MD2", "MD3", "MD4", "MD5"] },
            { title: "Women's", items: ["WD1", "WD2", "WD3", "WD4"] },
            {
              title: "Uカテゴリー（ジュニア）",
              items: ["U-8", "U-10", "U-12M", "U-12W", "U-15M", "U-15W"],
            },
          ].map((g, i) => (
            <FadeIn key={g.title} delay={i * 0.06}>
              <Card className="h-full">
                <h3 className="font-bold">{g.title}</h3>
                <ol className="mt-4 flex flex-wrap items-center gap-2">
                  {g.items.map((d) => (
                    <li
                      key={d}
                      className="rounded-full border border-line bg-white px-3 py-1 font-display text-sm font-bold"
                    >
                      {d}
                    </li>
                  ))}
                </ol>
              </Card>
            </FadeIn>
          ))}
        </div>
        <p className="mt-6 text-sm text-text-2">
          Uカテゴリーは生年月日から自動で決まります。Men&apos;s / Women&apos;s のDivisionは Division
          Tryout で決まります。
        </p>
      </Section>

      {/* At the gym */}
      <Section tone="subtle" aria-labelledby="gym-title">
        <SectionHeading id="gym-title" eyebrow="At the gym" title="ジムでの参加のしかた" />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AT_GYM.map((s, i) => (
            <FadeIn as="li" key={s.title} delay={i * 0.06}>
              <Card className="h-full">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full border border-line bg-white">
                    <s.icon className="size-5" aria-hidden />
                  </span>
                  <span className="font-display text-sm font-bold text-text-3">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-2 text-[15px] text-text-2">{s.text}</p>
              </Card>
            </FadeIn>
          ))}
        </ol>
      </Section>

      {/* FAQ */}
      <Section aria-labelledby="join-faq-title">
        <SectionHeading
          id="join-faq-title"
          eyebrow="FAQ"
          title="よくある質問"
          action={
            <Button href="/faq" variant="text">
              質問をすべて見る
            </Button>
          }
        />
        <FadeIn className="mt-8">
          <div className="divide-y divide-line rounded-2xl border border-line bg-white/70 backdrop-blur-md">
            {FAQ.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-bold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    className="text-text-3 transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="px-6 pb-5 text-[15px] text-text-2">{item.a}</p>
              </details>
            ))}
          </div>
        </FadeIn>
      </Section>

      {/* Final CTA */}
      <section className="bg-[#0b0b0d] text-white">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-20 md:flex-row md:items-center md:justify-between">
          <p className="text-[clamp(1.5rem,1.2rem+1.4vw,2.25rem)] font-bold">
            <Phrase>まずは選手登録から。</Phrase>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/register" variant="inverse" size="lg">
              選手登録（無料）
            </Button>
            <Button href="/schedule" variant="glass" size="lg">
              日程を見る
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
