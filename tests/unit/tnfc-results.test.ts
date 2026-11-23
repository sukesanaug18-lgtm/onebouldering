import { describe, expect, it } from "vitest";
import {
  categorySizeMultiplier,
  finalistsNewsText,
  hpResultCsv,
  parseResultCsv,
  resultCategory,
  scoreResults,
  tnfcRankingPoints,
} from "@/domain/tnfc-results";

describe("tnfcRankingPoints", () => {
  it("uses place points × category size multiplier", () => {
    expect(tnfcRankingPoints(1, 30)).toBe(12000);
    expect(tnfcRankingPoints(1, 11)).toBe(10000);
    expect(tnfcRankingPoints(2, 10)).toBe(6400);
    expect(tnfcRankingPoints(6, 5)).toBe(2400);
    expect(tnfcRankingPoints(15, 20)).toBe(1000);
    expect(tnfcRankingPoints(1, 2)).toBe(5000);
    expect(tnfcRankingPoints(0, 20)).toBe(0);
  });
  it("multiplier boundaries", () => {
    expect([1, 2, 3, 10, 11, 25, 26].map(categorySizeMultiplier)).toEqual([
      0.5, 0.5, 0.8, 0.8, 1, 1, 1.2,
    ]);
  });
});

it("resultCategory reads TNFC Control names", () => {
  expect(resultCategory("Division 3")).toBe("Men‘s Division 3");
  expect(resultCategory("Women's Division 2")).toBe("Women‘s Division 2");
  expect(resultCategory("U-15M")).toBe("U-15M");
});

describe("parseResultCsv", () => {
  const members = new Map([
    ["101", { name: "会員 一郎", division: "Men‘s Division 3" }],
    ["102", { name: "会員 花子", division: "Women‘s Division 2" }],
  ]);
  it("reads rows, fills blanks from members and reports problems", () => {
    const csv = [
      "順位\tライセンスNo\t氏名\tカテゴリー",
      "1\t101\t\t",
      "2\t102\t選手 花子\tWomen's Division 2",
      "\t103\t順位なし\tDivision 3",
      "3\t999\t未登録\tDivision 3",
      "4\t101\t重複\tDivision 3",
    ].join("\n");
    const r = parseResultCsv(csv, members);
    expect(r.rows.map((x) => [x.userId, x.name, x.division, x.rank])).toEqual([
      ["101", "会員 一郎", "Men‘s Division 3", 1],
      ["102", "選手 花子", "Women‘s Division 2", 2],
      ["999", "未登録", "Men‘s Division 3", 3],
    ]);
    expect(r.skippedLines).toEqual([4]);
    expect(r.unknownIds).toEqual(["999"]);
    expect(r.duplicateIds).toEqual(["101"]);
  });
});

describe("scoreResults", () => {
  const rows = [
    ...Array.from({ length: 12 }, (_, i) => ({
      userId: `m${i}`,
      name: `M${i}`,
      division: "Men‘s Division 3",
      rank: i + 1,
      score: "",
    })),
    { userId: "w1", name: "W1", division: "Women‘s Division 2", rank: 1, score: "" },
    { userId: "w2", name: "W2", division: "Women‘s Division 2", rank: 2, score: "" },
  ];
  it("counts each category on its own and applies per-category lines", () => {
    const s = scoreResults(rows, 3, { "Women‘s Division 2": 1 });
    const m1 = s.find((r) => r.userId === "m0")!;
    expect([m1.categoryCount, m1.points, m1.qualified]).toEqual([12, 10000, true]);
    expect(s.find((r) => r.userId === "m3")!.qualified).toBe(false);
    const w2 = s.find((r) => r.userId === "w2")!;
    expect([w2.categoryCount, w2.points, w2.qualified]).toEqual([2, 4000, false]);
    // Women's categories come before men's (bib order).
    expect(s[0].division).toBe("Women‘s Division 2");
  });
  it("makes the CSV and NEWS text with official names", () => {
    const s = scoreResults(rows, 3);
    const csv = hpResultCsv({ seasonId: "2027", venueName: "ジムA", eventDate: "2027-01-24" }, s);
    expect(csv.split("\n")[1]).toContain("Women‘s Division 2");
    expect(csv).toContain("獲得");
    const news = finalistsNewsText(
      { roundName: "ROUND1", venueName: "ジムA", eventDate: "2027-01-24" },
      s,
    );
    expect(news).toContain("5名");
    expect(news).toContain("■ Men‘s Division 3");
  });
});
