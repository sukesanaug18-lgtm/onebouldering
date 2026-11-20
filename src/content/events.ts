import type { EventKey } from "@/components/ui/Badge";

// The three events (CLAUDE.md 5). Copy is based on the current site.
// `period` is a placeholder until event dates come from Firestore.

export type EventInfo = {
  key: EventKey;
  name: string;
  /** Short Japanese label shown above the name. */
  kind: string;
  /** One line: what this event is. */
  summary: string;
  period: string;
  href: string;
};

export const EVENTS: EventInfo[] = [
  {
    key: "tnfc",
    name: "THE NORTH FACE CUP",
    kind: "全国大会",
    summary: "全国の予選ラウンドを勝ち抜いて本戦へ。国内最大級のボルダリングコンペです。",
    period: "予選 2027年1月〜 ／ 本戦 2027年春",
    href: "/tnfc",
  },
  {
    key: "tryout",
    name: "Division Tryout",
    kind: "クラス認定",
    summary: "参加ジムで指定の6課題に挑戦。完登した数で、自分のDivision（クラス）が決まります。",
    period: "通年・参加ジムで受験",
    href: "/tryout/about",
  },
  {
    key: "ranking",
    name: "ONE bouldering Ranking",
    kind: "全国ランキング",
    summary: "全国の参加ジムのランキング課題と大会のポイントを合計して、年間の順位を競います。",
    period: "2026年4月〜2027年3月",
    href: "/ranking/about",
  },
];

/** Steps on the "how to join" diagram (CLAUDE.md 5-3). */
export const JOURNEY = [
  {
    title: "選手登録",
    text: "無料で登録。生年月日からUカテゴリーが自動で決まります。",
    href: "/register",
  },
  {
    title: "Tryout でクラス決定",
    text: "参加ジムで Division Tryout を受けて、自分のクラスを決めます。",
    href: "/tryout/about",
  },
  {
    title: "Ranking に参加",
    text: "ジムのランキング課題に挑戦して、スコアを提出します。",
    href: "/ranking/about",
  },
  {
    title: "TNFC 予選・本戦",
    text: "認定されたDivisionで、THE NORTH FACE CUP に出場します。",
    href: "/tnfc",
  },
] as const;
