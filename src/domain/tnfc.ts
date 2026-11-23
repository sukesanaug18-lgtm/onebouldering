// THE NORTH FACE CUP rules (CLAUDE.md 4: src/domain). Ported from the current app's
// functions and tnfcLogic.ts (assignContinuousBibNumbers, generateSessionGroups,
// detectEntryDiscrepancies, buildTnfcControlCsv, buildReceptionSheetCsv, parseCsvRows).

import { canonicalDivision, divisionName, UNDECIDED_DIVISION } from "./division.ts";
import { toCsv } from "./gym.ts";

/** Category name used by TNFC Control: "Men‘s Division 3" → "Division 3", women keep the prefix. */
export function tnfcControlCategory(canonDiv: string): string {
  if (!canonDiv || canonDiv === UNDECIDED_DIVISION) return "未確定";
  const m = canonDiv.match(/^Men[‘'’]s\s*Division\s*(\d+)$/i);
  if (m) return `Division ${m[1]}`;
  const w = canonDiv.match(/^Women[‘'’]s\s*Division\s*(\d+)$/i);
  if (w) return `Women's Division ${w[1]}`;
  return canonDiv;
}

// ---------------------------------------------------------------------------------------------
// Before the qualifier (workflow diagram B-4, 1.1.1–1.1.4)
// ---------------------------------------------------------------------------------------------

/** One entry as the office screens use it. */
export type TnfcEntry = {
  id: string;
  userId: string;
  registeredName: string;
  currentUserName: string;
  furigana: string;
  gender: string;
  division: string;
  email: string;
  zeusOrderNo: string;
  status: string;
  bibNo: number | null;
  sessionGroup: string;
};

/** The member data an entry is checked against. */
export type TnfcMember = {
  name: string;
  furigana: string;
  gender: string;
  division: string;
  email: string;
};

export const isActiveEntry = (e: Pick<TnfcEntry, "status">) => e.status !== "cancelled";
export const isPaid = (e: Pick<TnfcEntry, "zeusOrderNo">) => e.zeusOrderNo.trim() !== "";
/** The name to print: the member's current name when known. */
export const entryName = (e: Pick<TnfcEntry, "currentUserName" | "registeredName">) =>
  e.currentUserName || e.registeredName;

/** Bib order: juniors first, then women 4→1, then men 5→1 (same as the current app). */
export const TNFC_CATEGORY_ORDER = [
  "U-8",
  "U-10",
  "U-12M",
  "U-12W",
  "U-15M",
  "U-15W",
  "Women‘s Division 4",
  "Women‘s Division 3",
  "Women‘s Division 2",
  "Women‘s Division 1",
  "Men‘s Division 5",
  "Men‘s Division 4",
  "Men‘s Division 3",
  "Men‘s Division 2",
  "Men‘s Division 1",
];

export function categoryRank(division: string): number {
  const i = TNFC_CATEGORY_ORDER.indexOf(canonicalDivision(division));
  return i < 0 ? TNFC_CATEGORY_ORDER.length : i;
}

/** Parses CSV or TSV text (quotes, line breaks in quotes, BOM) into rows keyed by the header. */
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const endCell = () => {
    row.push(cell.trim());
    cell = "";
  };
  const endRow = () => {
    endCell();
    if (row.some((v) => v !== "")) rows.push(row);
    row = [];
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === "," || ch === "\t") endCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      endRow();
    } else cell += ch;
  }
  if (cell !== "" || row.length > 0) endRow();
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.replace(/\s+/g, ""));
  return rows.slice(1).map((vals) => Object.fromEntries(head.map((h, i) => [h, vals[i] ?? ""])));
}

const pick = (r: Record<string, string>, keys: string[]) => {
  for (const k of keys) if (r[k]?.trim()) return r[k].trim();
  return "";
};

export type ParsedEntry = Omit<TnfcEntry, "id" | "bibNo" | "sessionGroup">;

/**
 * Turns an entry CSV from the old site (or any CSV with the same headers) into entries.
 * Rows without a license No. are skipped and reported by line number (header = line 1).
 * The Division comes from the CSV; differences with the member are shown by findEntryIssues.
 */
export function parseEntryCsv(
  text: string,
  members: Map<string, TnfcMember>,
): { entries: ParsedEntry[]; skippedLines: number[]; unknownIds: string[] } {
  const rows = parseCsv(text);
  const entries = new Map<string, ParsedEntry>();
  const skippedLines: number[] = [];
  const unknownIds: string[] = [];
  rows.forEach((r, i) => {
    const userId = pick(r, [
      "ID",
      "ライセンスNo",
      "ライセンスNo.",
      "LICENCENO.",
      "LICENSENO.",
      "userId",
    ]);
    if (!/^\d{1,10}$/.test(userId)) {
      skippedLines.push(i + 2);
      return;
    }
    const m = members.get(userId);
    if (!m) unknownIds.push(userId);
    const status = pick(r, ["キャンセル", "ステータス", "status"]);
    const zeusOrderNo = pick(r, ["ZEUSオーダーNo", "ZEUSオーダーNo.", "オーダーNo", "orderNo"]);
    const registeredName = pick(r, ["氏名", "名前", "name"]) || m?.name || userId;
    const rawDivision = pick(r, ["カテゴリー", "Division", "division"]) || m?.division || "";
    entries.set(userId, {
      userId,
      registeredName,
      currentUserName: m?.name || registeredName,
      furigana: pick(r, ["ふりがな", "フリガナ", "furigana"]) || m?.furigana || "",
      gender: pick(r, ["性別", "gender"]) || m?.gender || "",
      division: canonicalDivision(rawDivision),
      email: pick(r, ["メールアドレス", "email", "Email"]) || m?.email || "",
      zeusOrderNo,
      status: /キャンセル|cancel/i.test(status)
        ? "cancelled"
        : zeusOrderNo
          ? "confirmed"
          : "pending_payment",
    });
  });
  return { entries: [...entries.values()], skippedLines, unknownIds };
}

export type EntryIssues = {
  unpaid: TnfcEntry[];
  undecided: TnfcEntry[];
  /** The member changed name since applying. */
  renamed: { entry: TnfcEntry; now: string }[];
  /** The member's Division changed (e.g. a Tryout) and the entry was not updated. */
  divisionChanged: { entry: TnfcEntry; now: string }[];
};

/** 1.1.4 and 1.1.1 checks. Cancelled entries are ignored. */
export function findEntryIssues(
  entries: TnfcEntry[],
  members: Map<string, TnfcMember>,
): EntryIssues {
  const out: EntryIssues = { unpaid: [], undecided: [], renamed: [], divisionChanged: [] };
  for (const e of entries.filter(isActiveEntry)) {
    if (!isPaid(e)) out.unpaid.push(e);
    const m = members.get(e.userId);
    const memberDiv = m ? canonicalDivision(m.division) : "";
    const div = canonicalDivision(e.division);
    if (m && memberDiv !== div && memberDiv !== UNDECIDED_DIVISION) {
      out.divisionChanged.push({ entry: e, now: memberDiv });
    } else if (div === UNDECIDED_DIVISION) {
      out.undecided.push(e);
    }
    if (m?.name && m.name.trim() !== entryName(e).trim()) {
      out.renamed.push({ entry: e, now: m.name.trim() });
    }
  }
  return out;
}

/** Unique, non-empty e-mail addresses joined for a BCC field. */
export function bccList(entries: Pick<TnfcEntry, "email">[]): string {
  return [...new Set(entries.map((e) => e.email.trim()).filter(Boolean))].join(", ");
}

/**
 * Continuous bib numbers (1.1.1): active entries only, starting after the previous venue's
 * last number, ordered by category, then furigana, then license No.
 */
export function assignBibNumbers(
  entries: TnfcEntry[],
  previousFinalBibNo: number,
): { bibs: Map<string, number>; lastBibNo: number } {
  let n = Math.max(0, Math.floor(previousFinalBibNo));
  const bibs = new Map<string, number>();
  [...entries]
    .filter(isActiveEntry)
    .sort(
      (a, b) =>
        categoryRank(a.division) - categoryRank(b.division) ||
        (a.furigana || a.registeredName).localeCompare(b.furigana || b.registeredName, "ja") ||
        a.userId.localeCompare(b.userId),
    )
    .forEach((e) => bibs.set(e.id, ++n));
  return { bibs, lastBibNo: n };
}

export type SessionGroup = {
  name: string;
  categories: string[];
  count: number;
  perArea: number;
  /** 6 or more climbers per area: the session should be longer. */
  needsMoreTime: boolean;
  firstBib: number | null;
  lastBib: number | null;
  entryIds: string[];
};

/**
 * Session groups (1.1.3): whole categories packed into groups of about 5 climbers per area.
 * A single category with more than 6 per area is split evenly.
 */
export function planSessionGroups(entries: TnfcEntry[], areaCount: number): SessionGroup[] {
  const areas = Math.max(1, Math.floor(areaCount));
  const target = areas * 5;
  const active = entries
    .filter(isActiveEntry)
    .sort(
      (a, b) =>
        categoryRank(a.division) - categoryRank(b.division) ||
        (a.bibNo ?? Infinity) - (b.bibNo ?? Infinity),
    );
  const byCategory = new Map<string, TnfcEntry[]>();
  for (const e of active) {
    const k = canonicalDivision(e.division);
    byCategory.set(k, [...(byCategory.get(k) ?? []), e]);
  }
  const groups: TnfcEntry[][] = [];
  let current: TnfcEntry[] = [];
  for (const list of byCategory.values()) {
    if (list.length > areas * 6) {
      if (current.length) groups.push(current);
      current = [];
      const parts = Math.ceil(list.length / target);
      const size = Math.ceil(list.length / parts);
      for (let i = 0; i < list.length; i += size) groups.push(list.slice(i, i + size));
      continue;
    }
    if (current.length && current.length + list.length > target) {
      groups.push(current);
      current = [];
    }
    current.push(...list);
  }
  if (current.length) groups.push(current);

  return groups.map((g, i) => {
    const bibs = g.map((e) => e.bibNo).filter((b): b is number => typeof b === "number");
    return {
      name: `Group ${String.fromCharCode(65 + i)}`,
      categories: [...new Set(g.map((e) => divisionName(e.division)))],
      count: g.length,
      perArea: Math.round((g.length / areas) * 10) / 10,
      needsMoreTime: g.length / areas >= 6,
      firstBib: bibs.length ? Math.min(...bibs) : null,
      lastBib: bibs.length ? Math.max(...bibs) : null,
      entryIds: g.map((e) => e.id),
    };
  });
}

const byBib = (entries: TnfcEntry[]) =>
  entries
    .filter(isActiveEntry)
    .sort(
      (a, b) =>
        (a.bibNo ?? Infinity) - (b.bibNo ?? Infinity) ||
        categoryRank(a.division) - categoryRank(b.division) ||
        a.userId.localeCompare(b.userId),
    );

/** 1.1.2 CSV for TNFC Control: men's categories become "Division X". */
export function tnfcControlCsv(entries: TnfcEntry[]): string {
  return toCsv(
    ["ゼッケンNo.", "ID", "氏名", "ふりがな", "カテゴリー"],
    byBib(entries).map((e) => [
      e.bibNo ?? "",
      e.userId,
      entryName(e),
      e.furigana,
      tnfcControlCategory(canonicalDivision(e.division)),
    ]),
  );
}

/** 1.1.1 reception sheet for the venue. */
export function receptionCsv(entries: TnfcEntry[]): string {
  return toCsv(
    ["ゼッケンNo.", "カテゴリー", "グループ", "ID", "氏名", "ふりがな", "入金"],
    byBib(entries).map((e) => [
      e.bibNo ?? "",
      divisionName(e.division),
      e.sessionGroup,
      e.userId,
      entryName(e),
      e.furigana,
      isPaid(e) ? "入金済み" : "未入金",
    ]),
  );
}

/** The 8 things to confirm with the venue (1.1.3). */
export const VENUE_CHECKLIST = [
  { key: "address", label: "住所" },
  { key: "phone", label: "電話番号" },
  { key: "receptionFlow", label: "受付" },
  { key: "postCompFlow", label: "終了後" },
  { key: "warmupArea", label: "アップ" },
  { key: "parking", label: "駐車場" },
  { key: "valuablesLuggage", label: "貴重品・荷物" },
  { key: "spectators", label: "観戦" },
] as const;

export type VenueChecklistKey = (typeof VENUE_CHECKLIST)[number]["key"];

/** Plain-text outline of the guidelines (time table + checklist) to copy and finish by hand. */
export function guidelineText(opts: {
  roundName: string;
  venueName: string;
  eventDate: string;
  entryDeadline: string;
  groups: SessionGroup[];
  checklist: Partial<Record<VenueChecklistKey, string>>;
}): string {
  return [
    opts.roundName,
    `会場：${opts.venueName}`,
    `日程：${opts.eventDate || "未定"}`,
    `エントリー締切：${opts.entryDeadline || "未定"}`,
    "",
    "■ タイムスケジュール（時間は会場と相談して記入）",
    ...(opts.groups.length
      ? opts.groups.map(
          (g) =>
            `${g.name}　${g.categories.join("・")}（${g.count}名${g.needsMoreTime ? "・時間延長" : ""}）　__:__〜__:__`,
        )
      : ["（エントリーを取り込むとグループが入ります）"]),
    "",
    "■ 会場について",
    ...VENUE_CHECKLIST.map((c) => `${c.label}：${opts.checklist[c.key]?.trim() || "（確認中）"}`),
  ].join("\n");
}
