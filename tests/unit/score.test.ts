import { describe, expect, it } from "vitest";
import { aggregateRankingData } from "@/domain/ranking";
import {
  approvedProblems,
  mergeSubmission,
  parsePointMaster,
  parsePrefill,
  sentProblems,
  totalPoints,
} from "@/domain/score";

describe("point master", () => {
  it("falls back to the problem number and skips other seasons", () => {
    const map = parsePointMaster(
      [
        { id: "p1", no: 1, points: 100, seasonId: "2027" },
        { id: "p2", no: 2, points: 999, seasonId: "2026" },
        { id: "no40", points: 4000 },
      ],
      "2027",
    );
    expect(map[1]).toBe(100);
    expect(map[2]).toBe(2);
    expect(map[40]).toBe(4000);
    expect(totalPoints([1, 2, 40], map)).toBe(4102);
  });
});

describe("stored records", () => {
  it("reads sent problems from every stored spelling", () => {
    expect(sentProblems({ problems: { "1": "Y", "2": "N", "3": true } })).toEqual([1, 3]);
    expect(sentProblems({ "5": "完登", 課題_6: "Y" })).toEqual([5, 6]);
  });

  it("treats a legacy approved record's problems as approved", () => {
    expect(approvedProblems({ status: "Approved", problems: { "4": "Y" } })).toEqual([4]);
    expect(approvedProblems({ status: "Pending", problems: { "4": "Y" } })).toEqual([]);
    expect(
      approvedProblems({ status: "Pending", approvedProblems: { "4": true, "5": false } }),
    ).toEqual([4]);
  });

  it("keeps approved problems when merging a new submission", () => {
    const m = mergeSubmission([10], [4]);
    expect(m["4"]).toBe("Y");
    expect(m["10"]).toBe("Y");
    expect(m["11"]).toBe("N");
    expect(Object.keys(m)).toHaveLength(40);
  });
});

describe("parsePrefill", () => {
  it("accepts only problem numbers 1–40", () => {
    expect(parsePrefill("9,7,8,8,x,41,0")).toEqual([7, 8, 9]);
    expect(parsePrefill(undefined)).toEqual([]);
  });
});

describe("ranking keeps approved points during re-review", () => {
  it("counts approvedTotalPoints for a Pending record", () => {
    const r = aggregateRankingData({
      users: [{ id: "1", name: "A", division: "MD3" }],
      venues: [{ id: "g", region: "関東" }],
      competitionResults: [],
      participantData: [
        {
          userId: "1",
          venueId: "g",
          status: "Pending",
          totalPoints: 900,
          approvedTotalPoints: 600,
        },
      ],
    });
    expect(r.global["Men‘s Division 3"][0].score).toBe(600);
  });
});
