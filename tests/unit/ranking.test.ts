import { describe, expect, it } from "vitest";
import { canonicalDivision, shortDivision } from "@/domain/division";
import {
  aggregateRankingData,
  parseRankingCache,
  promotionCutoff,
  withRanks,
} from "@/domain/ranking";

describe("division names", () => {
  it("normalizes legacy spellings and quotes", () => {
    expect(canonicalDivision("MD3")).toBe("Men‘s Division 3");
    expect(canonicalDivision("Men's Division 2")).toBe("Men‘s Division 2");
    expect(canonicalDivision("WD4")).toBe("Women‘s Division 4");
    expect(canonicalDivision("u15w")).toBe("U-15W");
    expect(canonicalDivision("UNDECIDED")).toBe("UNDECIDED");
    expect(canonicalDivision("未確定")).toBe("UNDECIDED");
  });

  it("gives short labels", () => {
    expect(shortDivision("Men‘s Division 3")).toBe("MD3");
    expect(shortDivision("U-12M")).toBe("U-12M");
  });
});

describe("aggregateRankingData", () => {
  // Same fixture as the current app's test (tests/integratedLogic.test.ts).
  const users = [
    { id: "1001", name: "田中", division: "Men‘s Division 3" },
    { id: "1002", name: "佐藤", division: "UNDECIDED" },
  ];
  const venues = ["g1", "g2", "g3", "g4"].map((id) => ({ id, name: id, region: "関東" }));
  const participantData = [
    { seasonId: "2027", userId: "1001", venueId: "g1", totalPoints: 500, status: "Approved" },
    { seasonId: "2027", userId: "1001", venueId: "g2", totalPoints: 400, status: "Approved" },
    { seasonId: "2027", userId: "1001", venueId: "g3", totalPoints: 300, status: "Approved" },
    { seasonId: "2027", userId: "1001", venueId: "g4", totalPoints: 200, status: "Approved" },
    { seasonId: "2027", userId: "1001", venueId: "g4", totalPoints: 999, status: "Pending" },
    { seasonId: "2026", userId: "1001", venueId: "g1", totalPoints: 9999, status: "Approved" },
    { seasonId: "2027", userId: "1002", venueId: "g1", totalPoints: 1000, status: "Approved" },
  ];
  const competitionResults = [
    { seasonId: "2027", userId: "1001", earnedPoints: 3000, status: "active" },
    { seasonId: "2027", userId: "1001", earnedPoints: 5000, status: "reset_by_promotion" },
  ];
  const res = aggregateRankingData({
    users,
    participantData,
    venues,
    competitionResults,
    seasonId: "2027",
  });

  it("overall = top 3 gyms + active competition points", () => {
    expect(res.global["Men‘s Division 3"]).toEqual([{ id: "1001", name: "田中", score: 4200 }]);
  });

  it("region = all gyms in the region, no competition points", () => {
    expect(res.region["関東"]["Men‘s Division 3"][0].score).toBe(1400);
  });

  it("gym = best approved score at that gym", () => {
    expect(res.gym["g4"]["Men‘s Division 3"][0].score).toBe(200);
  });

  it("counts gyms visited and excludes UNDECIDED", () => {
    expect(res.shopCount?.global["Men‘s Division 3"][0].count).toBe(4);
    expect(res.global["UNDECIDED"]).toBeUndefined();
  });

  it("keeps the best score when the same gym is approved twice", () => {
    const r = aggregateRankingData({
      users,
      venues,
      competitionResults: [],
      participantData: [
        { userId: "1001", venueId: "g1", totalPoints: 100, status: "Approved" },
        { userId: "1001", venueId: "g1", totalPoints: 300, status: "Approved" },
      ],
    });
    expect(r.gym["g1"]["Men‘s Division 3"][0].score).toBe(300);
  });
});

describe("ranking helpers", () => {
  it("shares ranks on ties", () => {
    const ranked = withRanks([
      { id: "a", name: "a", score: 10 },
      { id: "b", name: "b", score: 8 },
      { id: "c", name: "c", score: 8 },
      { id: "d", name: "d", score: 5 },
    ]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
  });

  it("promotion cutoff is top 10% only for MD3, MD4, WD3", () => {
    expect(promotionCutoff("MD3", 25)).toBe(3);
    expect(promotionCutoff("Women‘s Division 3", 10)).toBe(1);
    expect(promotionCutoff("MD2", 25)).toBe(0);
    expect(promotionCutoff("MD4", 0)).toBe(0);
  });

  it("parses stored cache documents", () => {
    const data = { global: {}, region: {}, gym: {} };
    expect(parseRankingCache({ cache_data: JSON.stringify(data) })).toEqual(data);
    expect(parseRankingCache({ cache_data: "not json" })).toBeNull();
    expect(parseRankingCache(undefined)).toBeNull();
  });
});

describe("myRankings", () => {
  it("finds the player's overall and region places with shared ranks", async () => {
    const { myRankings } = await import("@/domain/ranking");
    const div = "Men‘s Division 3";
    const data = {
      global: {
        [div]: [
          { id: "a", name: "A", score: 900 },
          { id: "b", name: "B", score: 800 },
          { id: "me", name: "Me", score: 800 },
        ],
      },
      region: { 関東: { [div]: [{ id: "me", name: "Me", score: 500 }] }, 関西: {} },
      gym: {},
    };
    const r = myRankings(data, "me", div);
    expect(r.overall).toEqual({ rank: 2, total: 3, score: 800 });
    expect(r.regions).toEqual([{ region: "関東", rank: 1, total: 1, score: 500 }]);
    expect(myRankings(null, "me", div).overall).toBeNull();
  });
});
