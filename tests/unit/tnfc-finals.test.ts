import { describe, expect, it } from "vitest";
import {
  aggregateFinalists,
  cancellationsCsv,
  cancelReply,
  finalsPromotions,
  nextDivision,
  type QualifierResult,
} from "@/domain/tnfc-finals";

const r = (o: Partial<QualifierResult>): QualifierResult => ({
  id: `${o.roundId ?? "r1"}_${o.userId}`,
  roundId: "r1",
  roundNumber: 1,
  venueName: "ジムA",
  userId: "u",
  name: "選手",
  division: "Men‘s Division 3",
  rank: 1,
  qualified: false,
  declined: false,
  ...o,
});

describe("aggregateFinalists", () => {
  it("lists finalists once with the next player of the same round and category", () => {
    const results = [
      r({ userId: "a", rank: 1, qualified: true }),
      r({ userId: "b", rank: 2, qualified: true }),
      r({ userId: "c", rank: 3 }),
      r({ userId: "d", rank: 4 }),
      r({ userId: "x", rank: 1, qualified: true, declined: true }),
      r({ userId: "w", rank: 1, qualified: true, division: "Women‘s Division 2" }),
      // Same player qualified again in round 2: counted once.
      r({ roundId: "r2", roundNumber: 2, userId: "a", rank: 1, qualified: true }),
    ];
    const { finalists, declined } = aggregateFinalists(results);
    expect(finalists.map((f) => f.userId)).toEqual(["w", "a", "b"]);
    expect(finalists.find((f) => f.userId === "a")!.next?.userId).toBe("c");
    expect(finalists.find((f) => f.userId === "w")!.next).toBeNull();
    expect(declined.map((d) => d.userId)).toEqual(["x"]);
  });
});

describe("finalsPromotions", () => {
  it("moves the top places up one Division, skipping tops, U and already moved players", () => {
    const results = [
      { userId: "a", name: "A", division: "Men‘s Division 3", rank: 1 },
      { userId: "b", name: "B", division: "Men‘s Division 3", rank: 4 },
      { userId: "c", name: "C", division: "Men‘s Division 1", rank: 1 },
      { userId: "d", name: "D", division: "U-15M", rank: 1 },
      { userId: "e", name: "E", division: "Women‘s Division 2", rank: 2 },
    ];
    const current = new Map([
      ["a", "Men‘s Division 3"],
      ["e", "Women‘s Division 1"],
    ]);
    expect(finalsPromotions(results, current, 3)).toEqual([
      { userId: "a", name: "A", rank: 1, from: "Men‘s Division 3", to: "Men‘s Division 2" },
    ]);
    expect(nextDivision("WD2")).toBe("Women‘s Division 1");
    expect(nextDivision("MD1")).toBeNull();
  });
});

it("cancel reply and ledger CSV use plain labels", () => {
  const text = cancelReply({
    name: "山田",
    roundName: "ROUND1",
    venueName: "ジムA",
    type: "convenience_refund",
    amount: 5500,
  });
  expect(text).toContain("5,500円");
  expect(text).not.toMatch(/\n\n\n/);
  const csv = cancellationsCsv([
    {
      processedAt: "2027-01-05T03:00:00.000Z",
      roundName: "ROUND1",
      userId: "1",
      userName: "山田",
      division: "MD3",
      zeusOrderNo: "ZE-1",
      cancelType: "cancellation_fee",
      amount: 1000,
      contactChannel: "dm",
      note: "",
    },
  ]);
  expect(csv).toContain(
    "2027-01-05,ROUND1,1,山田,Men‘s Division 3,ZE-1,キャンセル料あり,1000,Instagram DM",
  );
});
