import { describe, expect, it } from "vitest";
import {
  assignBibNumbers,
  bccList,
  findEntryIssues,
  guidelineText,
  parseCsv,
  parseEntryCsv,
  planSessionGroups,
  receptionCsv,
  tnfcControlCsv,
  type TnfcEntry,
  type TnfcMember,
} from "@/domain/tnfc";

const M3 = "Men‘s Division 3";
const W2 = "Women‘s Division 2";

function entry(over: Partial<TnfcEntry> & { userId: string }): TnfcEntry {
  return {
    id: `r1_${over.userId}`,
    registeredName: `選手${over.userId}`,
    currentUserName: "",
    furigana: "",
    gender: "",
    division: M3,
    email: `${over.userId}@example.test`,
    zeusOrderNo: "Z1",
    status: "confirmed",
    bibNo: null,
    sessionGroup: "",
    ...over,
  };
}

const member = (over: Partial<TnfcMember> = {}): TnfcMember => ({
  name: "",
  furigana: "",
  gender: "",
  division: M3,
  email: "",
  ...over,
});

describe("parseCsv", () => {
  it("reads quotes, BOM, CRLF and tabs", () => {
    const rows = parseCsv('﻿ID,氏名\r\n1,"山田, 太郎"\r\n2,"say ""hi"""\r\n');
    expect(rows).toEqual([
      { ID: "1", 氏名: "山田, 太郎" },
      { ID: "2", 氏名: 'say "hi"' },
    ]);
    expect(parseCsv("ID\t氏名\n3\t佐藤")).toEqual([{ ID: "3", 氏名: "佐藤" }]);
  });
});

describe("parseEntryCsv", () => {
  it("normalizes Division, payment and cancellation, and reports bad rows", () => {
    const members = new Map([["10001", member({ name: "新しい名前", email: "a@example.test" })]]);
    const csv = [
      "ID,氏名,カテゴリー,ZEUSオーダーNo,ステータス",
      "10001,古い名前,MD3,Z-1,",
      "10002,未入金さん,Women's Division 2,,",
      ",名前だけ,MD4,,",
      "10003,キャンセルさん,MD5,Z-3,キャンセル",
    ].join("\n");
    const { entries, skippedLines, unknownIds } = parseEntryCsv(csv, members);
    expect(skippedLines).toEqual([4]);
    expect(unknownIds).toEqual(["10002", "10003"]);
    expect(entries.map((e) => [e.userId, e.division, e.status])).toEqual([
      ["10001", M3, "confirmed"],
      ["10002", W2, "pending_payment"],
      ["10003", "Men‘s Division 5", "cancelled"],
    ]);
    expect(entries[0].registeredName).toBe("古い名前");
    expect(entries[0].currentUserName).toBe("新しい名前");
    expect(entries[0].email).toBe("a@example.test");
  });
});

describe("findEntryIssues", () => {
  it("finds unpaid, undecided, renamed and Division changes, ignoring cancelled", () => {
    const entries = [
      entry({ userId: "1", zeusOrderNo: "" }),
      entry({ userId: "2", division: "UNDECIDED" }),
      entry({ userId: "3", registeredName: "旧姓" }),
      entry({ userId: "4", division: "Men‘s Division 4" }),
      entry({ userId: "5", zeusOrderNo: "", status: "cancelled" }),
    ];
    const members = new Map([
      ["1", member({ name: "選手1" })],
      ["2", member({ name: "選手2", division: "UNDECIDED" })],
      ["3", member({ name: "新姓" })],
      ["4", member({ name: "選手4", division: M3 })],
    ]);
    const r = findEntryIssues(entries, members);
    expect(r.unpaid.map((e) => e.userId)).toEqual(["1"]);
    expect(r.undecided.map((e) => e.userId)).toEqual(["2"]);
    expect(r.renamed).toEqual([{ entry: entries[2], now: "新姓" }]);
    expect(r.divisionChanged).toEqual([{ entry: entries[3], now: M3 }]);
  });

  it("an undecided entry whose member now has a Division is a Division change", () => {
    const e = entry({ userId: "1", division: "UNDECIDED" });
    const r = findEntryIssues([e], new Map([["1", member({ division: W2 })]]));
    expect(r.undecided).toEqual([]);
    expect(r.divisionChanged).toEqual([{ entry: e, now: W2 }]);
  });
});

it("bccList removes blanks and duplicates", () => {
  expect(bccList([{ email: "a@x.test" }, { email: " " }, { email: "a@x.test" }])).toBe("a@x.test");
});

describe("assignBibNumbers", () => {
  it("numbers active entries after the previous last bib, by category then furigana", () => {
    const entries = [
      entry({ userId: "1", division: "Men‘s Division 1", furigana: "あ" }),
      entry({ userId: "2", division: M3, furigana: "か" }),
      entry({ userId: "3", division: M3, furigana: "あ" }),
      entry({ userId: "4", division: "U-10", furigana: "さ" }),
      entry({ userId: "5", division: M3, status: "cancelled" }),
    ];
    const { bibs, lastBibNo } = assignBibNumbers(entries, 120);
    expect(Object.fromEntries(bibs)).toEqual({ r1_4: 121, r1_3: 122, r1_2: 123, r1_1: 124 });
    expect(lastBibNo).toBe(124);
  });
});

describe("planSessionGroups", () => {
  const many = (n: number, division: string, from = 0) =>
    Array.from({ length: n }, (_, i) =>
      entry({ userId: String(from + i), division, bibNo: from + i }),
    );

  it("packs whole categories up to about 5 per area", () => {
    const groups = planSessionGroups(
      [...many(12, "U-10"), ...many(12, W2, 100), ...many(10, M3, 200)],
      4,
    );
    expect(groups.map((g) => [g.name, g.count, g.categories])).toEqual([
      ["Group A", 12, ["U-10"]],
      ["Group B", 12, [W2]],
      ["Group C", 10, [M3]],
    ]);
    expect(groups.every((g) => !g.needsMoreTime)).toBe(true);
    expect([groups[0].firstBib, groups[0].lastBib]).toEqual([0, 11]);
  });

  it("splits a category with more than 6 per area and flags 6+ per area", () => {
    const groups = planSessionGroups(many(30, M3), 4);
    expect(groups.map((g) => g.count)).toEqual([15, 15]);
    const crowded = planSessionGroups(many(24, M3), 4);
    expect(crowded).toHaveLength(1);
    expect(crowded[0].needsMoreTime).toBe(true);
    expect(crowded[0].perArea).toBe(6);
  });
});

describe("CSV exports", () => {
  const entries = [
    entry({ userId: "2", bibNo: 2, division: W2, furigana: "い", zeusOrderNo: "" }),
    entry({ userId: "1", bibNo: 1, currentUserName: "今の名前", sessionGroup: "Group A" }),
    entry({ userId: "3", bibNo: null, status: "cancelled" }),
  ];
  it("TNFC Control CSV uses Division X and skips cancelled", () => {
    const lines = tnfcControlCsv(entries).replace(/^﻿/, "").trim().split("\r\n");
    expect(lines).toEqual([
      "ゼッケンNo.,ID,氏名,ふりがな,カテゴリー",
      "1,1,今の名前,,Division 3",
      "2,2,選手2,い,Women's Division 2",
    ]);
  });
  it("reception CSV shows official names, group and payment", () => {
    const lines = receptionCsv(entries).replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[1]).toBe(`1,${M3},Group A,1,今の名前,,入金済み`);
    expect(lines[2]).toBe(`2,${W2},,2,選手2,い,未入金`);
  });
});

it("guidelineText lists groups and the 8 venue items", () => {
  const text = guidelineText({
    roundName: "ROUND1",
    venueName: "ジム",
    eventDate: "2027/01/10",
    entryDeadline: "",
    groups: [],
    checklist: { parking: "なし" },
  });
  expect(text).toContain("駐車場：なし");
  expect(text).toContain("観戦：（確認中）");
  expect(text).toContain("エントリー締切：未定");
});
