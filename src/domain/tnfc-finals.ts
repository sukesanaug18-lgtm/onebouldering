// THE NORTH FACE CUP: cancellations, venue changes (workflow diagram B-8, 1.6.1–1.6.2, and B-5
// 1.2.3) and the finals (diagram B-6, 1.3–1.4). Ported from the current app's tnfcLogic.ts
// (aggregateFinalsQualifiers, computePostFinalsPromotions) and TnfcOperationsManager. Pure logic.

import { canonicalDivision, divisionName } from "./division.ts";
import { toCsv } from "./gym.ts";
import { categoryRank } from "./tnfc.ts";

/** Rounds numbered 90 and above are the finals; below are qualifiers. */
export const FINALS_ROUND_NUMBER = 99;
export const isFinalsRound = (r: { roundNumber: number }) => r.roundNumber >= 90;

export const CANCEL_TYPES = {
  convenience_refund: "コンビニ返金",
  cancellation_fee: "キャンセル料あり",
  free_cancel: "返金なし・料金なし",
} as const;
export type CancelType = keyof typeof CANCEL_TYPES;

export const CONTACT_CHANNELS = {
  mail: "メール",
  dm: "Instagram DM",
  phone: "電話",
  admin: "事務局で直接",
} as const;
export type ContactChannel = keyof typeof CONTACT_CHANNELS;

/** Reply to send through the same channel the player used. */
export function cancelReply(o: {
  name: string;
  roundName: string;
  venueName: string;
  type: CancelType;
  amount: number;
}): string {
  const money =
    o.type === "convenience_refund"
      ? `参加費はコンビニ返金でお返しします${o.amount > 0 ? `（${o.amount.toLocaleString()}円）` : ""}。手続きのご案内を別途お送りしますので、しばらくお待ちください。`
      : o.type === "cancellation_fee"
        ? `規定により、キャンセル料${o.amount > 0 ? ` ${o.amount.toLocaleString()}円` : ""}をいただきます。`
        : "";
  return [
    `${o.name} 様`,
    "",
    "いつも ONE Bouldering にご参加いただき、ありがとうございます。",
    `${o.roundName}（${o.venueName}）のキャンセルを承りました。`,
    money,
    "またのご参加をお待ちしています。",
    "",
    "ONE Bouldering 事務局",
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
}

export function moveReply(o: {
  name: string;
  fromVenue: string;
  toRoundName: string;
  toVenue: string;
  toDate: string;
}): string {
  return [
    `${o.name} 様`,
    "",
    "会場変更のご連絡ありがとうございます。",
    `出場会場を「${o.fromVenue}」から「${o.toRoundName}（${o.toVenue}${o.toDate ? `・${o.toDate.replaceAll("-", "/")}` : ""}）」に変更しました。`,
    "ゼッケン番号と出場グループは、新しい会場の要項でお知らせします。",
    "",
    "ONE Bouldering 事務局",
  ].join("\n");
}

export function declineReply(o: { name: string; seasonId: string }): string {
  return [
    `${o.name} 様`,
    "",
    `THE NORTH FACE CUP ${o.seasonId} 本戦の出場辞退を承りました。`,
    "ご連絡ありがとうございました。来シーズンのご参加もお待ちしています。",
    "",
    "ONE Bouldering 事務局",
  ].join("\n");
}

export type CancellationRow = {
  processedAt: string;
  roundName: string;
  userId: string;
  userName: string;
  division: string;
  zeusOrderNo: string;
  cancelType: string;
  amount: number;
  contactChannel: string;
  note: string;
};

/** The コンビニ返金・キャンセル料 list as CSV. */
export function cancellationsCsv(rows: CancellationRow[]): string {
  return toCsv(
    [
      "処理日",
      "大会",
      "ID",
      "氏名",
      "カテゴリー",
      "ZEUSオーダーNo",
      "区分",
      "金額",
      "連絡手段",
      "メモ",
    ],
    rows.map((r) => [
      r.processedAt.slice(0, 10),
      r.roundName,
      r.userId,
      r.userName,
      divisionName(r.division),
      r.zeusOrderNo,
      CANCEL_TYPES[r.cancelType as CancelType] ?? r.cancelType,
      r.amount,
      CONTACT_CHANNELS[r.contactChannel as ContactChannel] ?? r.contactChannel,
      r.note,
    ]),
  );
}

// ---------------------------------------------------------------------------------------------
// Finals (1.3–1.4)
// ---------------------------------------------------------------------------------------------

export type QualifierResult = {
  id: string;
  roundId: string;
  roundNumber: number;
  venueName: string;
  userId: string;
  name: string;
  division: string;
  rank: number;
  qualified: boolean;
  declined: boolean;
};

export type Finalist = QualifierResult & {
  /** The next player of the same round and category who could move up if this one declines. */
  next: QualifierResult | null;
};

/**
 * Finalists from every qualifier round, in bib order (category, round, place), with the
 * next-in-line player for each. A player qualified in two rounds appears once (first round).
 */
export function aggregateFinalists(results: QualifierResult[]): {
  finalists: Finalist[];
  declined: QualifierResult[];
} {
  const waiting = new Map<string, QualifierResult[]>();
  for (const r of results) {
    if (r.qualified || r.declined || r.rank <= 0) continue;
    const key = `${r.roundId}\u0000${r.division}`;
    waiting.set(key, [...(waiting.get(key) ?? []), r]);
  }
  for (const list of waiting.values()) list.sort((a, b) => a.rank - b.rank);
  // A player who qualified in another round is already in the finals, so never an alternate.
  const qualified = new Set(results.filter((r) => r.qualified && !r.declined).map((r) => r.userId));
  const nextOf = (r: QualifierResult) =>
    waiting.get(`${r.roundId}\u0000${r.division}`)?.find((w) => !qualified.has(w.userId)) ?? null;

  const seen = new Set<string>();
  const finalists: Finalist[] = [];
  const sorted = [...results].sort(
    (a, b) =>
      categoryRank(a.division) - categoryRank(b.division) ||
      a.roundNumber - b.roundNumber ||
      a.rank - b.rank,
  );
  for (const r of sorted) {
    if (!r.qualified || r.declined || seen.has(r.userId)) continue;
    seen.add(r.userId);
    finalists.push({ ...r, next: nextOf(r) });
  }
  return { finalists, declined: sorted.filter((r) => r.declined) };
}

const NEXT_DIVISION: Record<string, string> = {
  "Men‘s Division 5": "Men‘s Division 4",
  "Men‘s Division 4": "Men‘s Division 3",
  "Men‘s Division 3": "Men‘s Division 2",
  "Men‘s Division 2": "Men‘s Division 1",
  "Women‘s Division 4": "Women‘s Division 3",
  "Women‘s Division 3": "Women‘s Division 2",
  "Women‘s Division 2": "Women‘s Division 1",
};

/** The Division one step up, or null at the top / for U categories. */
export const nextDivision = (div: string) => NEXT_DIVISION[canonicalDivision(div)] ?? null;

export type Promotion = {
  userId: string;
  name: string;
  rank: number;
  from: string;
  to: string;
};

/** 1.4 Finals places within the cutoff (default top 3) move up one Division. */
export function finalsPromotions(
  results: { userId: string; name: string; division: string; rank: number; declined?: boolean }[],
  currentDivision: Map<string, string>,
  cutoff = 3,
): Promotion[] {
  const out: Promotion[] = [];
  for (const r of [...results].sort(
    (a, b) => categoryRank(a.division) - categoryRank(b.division) || a.rank - b.rank,
  )) {
    if (r.declined || r.rank <= 0 || r.rank > cutoff) continue;
    // Promote from the category the player competed in; skip anyone already moved on.
    const competed = canonicalDivision(r.division);
    const now = canonicalDivision(currentDivision.get(r.userId) ?? competed);
    const to = nextDivision(competed);
    if (!to || now !== competed) continue;
    out.push({ userId: r.userId, name: r.name, rank: r.rank, from: competed, to });
  }
  return out;
}

/** Text for the finals results and promotions NEWS post. */
export function finalsNewsText(
  round: { roundName: string; venueName: string; eventDate: string },
  results: { name: string; division: string; rank: number }[],
  promotions: Promotion[],
): string {
  const lines = [
    `${round.roundName} 結果と Division 昇格のお知らせ`,
    "",
    `${round.eventDate.replaceAll("-", "/")} に ${round.venueName} で開催した ${round.roundName} の結果です。`,
  ];
  const cats = [...new Set(results.map((r) => r.division))].sort(
    (a, b) => categoryRank(a) - categoryRank(b),
  );
  for (const c of cats) {
    lines.push("", `■ ${divisionName(c)}`);
    for (const r of results.filter((x) => x.division === c && x.rank > 0 && x.rank <= 3)) {
      lines.push(`${r.rank}位　${r.name}`);
    }
  }
  if (promotions.length > 0) {
    lines.push("", "■ Division 昇格");
    for (const p of promotions) {
      lines.push(`${p.name}　${divisionName(p.from)} → ${divisionName(p.to)}`);
    }
  }
  lines.push("", "ご参加いただいた皆さま、ありがとうございました。");
  return lines.join("\n");
}
