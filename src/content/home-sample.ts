import type { EventKey } from "@/components/ui/Badge";

// SAMPLE DATA for the top page layout. Replaced by Firestore queries in the data step
// (tnfc_rounds / venues for upcoming, ranking_cache for ranking, news_articles for news).

export type UpcomingItem = {
  event: EventKey;
  title: string;
  date: string;
  place: string;
  status: "open" | "soon" | "live";
  href: string;
};

export const SAMPLE_UPCOMING: UpcomingItem[] = [
  {
    event: "tryout",
    title: "Division Tryout（通年）",
    date: "2026年11月〜",
    place: "全国の参加ジム",
    status: "live",
    href: "/tryout/about",
  },
  {
    event: "ranking",
    title: "ONE bouldering Ranking 2026-27",
    date: "2027年3月31日まで",
    place: "全国の参加ジム",
    status: "live",
    href: "/ranking",
  },
  {
    event: "tnfc",
    title: "THE NORTH FACE CUP 2027 予選",
    date: "2027年1月〜",
    place: "全国各地",
    status: "soon",
    href: "/tnfc",
  },
];

export type RankingRow = { rank: number; name: string; gym: string; points: number };

export const SAMPLE_RANKING: { label: string; rows: RankingRow[] }[] = [
  {
    label: "男子",
    rows: [
      { rank: 1, name: "サンプル選手A", gym: "BOLZ", points: 1280 },
      { rank: 2, name: "サンプル選手B", gym: "CRAGERS", points: 1195 },
      { rank: 3, name: "サンプル選手C", gym: "RAY", points: 1150 },
    ],
  },
  {
    label: "女子",
    rows: [
      { rank: 1, name: "サンプル選手D", gym: "Share", points: 1210 },
      { rank: 2, name: "サンプル選手E", gym: "CRUX", points: 1105 },
      { rank: 3, name: "サンプル選手F", gym: "WABO", points: 1040 },
    ],
  },
];

export type NewsItem = { date: string; category: string; title: string; href: string };

export const SAMPLE_NEWS: NewsItem[] = [
  {
    date: "2026-11-20",
    category: "TNFC",
    title: "（サンプル）THE NORTH FACE CUP 2027 予選の日程を公開しました",
    href: "/news",
  },
  {
    date: "2026-11-12",
    category: "Ranking",
    title: "（サンプル）11月のランキングを更新しました",
    href: "/news",
  },
  {
    date: "2026-11-01",
    category: "お知らせ",
    title: "（サンプル）参加ジムが増えました",
    href: "/news",
  },
];

export const SAMPLE_SPONSORS = [
  { name: "NEWHALE", logo: "/images/logos/newhale.png" },
  { name: "REWHITE", logo: "/images/logos/rewhite.png" },
  { name: "SAVAS", logo: "/images/logos/savas_logo.png" },
];
