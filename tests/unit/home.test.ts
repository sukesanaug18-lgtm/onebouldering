import { describe, expect, it } from "vitest";
import { buildRankingTop, buildUpcoming, dateLabel, parsePeriod } from "@/domain/home";

it("parsePeriod reads the first and last date in free text", () => {
  expect(parsePeriod("2026/4/1〜2027/3/31")).toEqual({ start: "2026-04-01", end: "2027-03-31" });
  expect(parsePeriod("2026-9-3(木) ～ 2026-9-29(火)")).toEqual({
    start: "2026-09-03",
    end: "2026-09-29",
  });
  expect(parsePeriod("2027/1/27~2/28")).toEqual({ start: "2027-01-27", end: "2027-02-28" });
  expect(parsePeriod("2026/12/5~1/11")).toEqual({ start: "2026-12-05", end: "2027-01-11" });
  expect(parsePeriod("2026/11/23~2026/12/30")).toEqual({ start: "2026-11-23", end: "2026-12-30" });
  expect(parsePeriod("2026/12/1〜")).toEqual({ start: "2026-12-01", end: "2026-12-01" });
  expect(parsePeriod("3月頃予定")).toBeNull();
  expect(parsePeriod("未定")).toBeNull();
  expect(dateLabel("2026-11-28")).toBe("2026.11.28（土）");
});

describe("buildUpcoming", () => {
  const today = "2026-11-24";
  const round = (o: Record<string, unknown>) => ({
    id: "r",
    roundNumber: 1,
    venueName: "ジムA",
    eventDate: "2026-12-05",
    status: "entry_open",
    finals: false,
    ...o,
  });

  it("lists running programs first, then rounds and gyms starting soon by date", () => {
    const items = buildUpcoming(
      {
        rounds: [
          round({ id: "a", eventDate: "2026-12-05" }),
          round({ id: "b", roundNumber: 2, eventDate: "2026-12-01", status: "draft" }),
          round({ id: "old", eventDate: "2026-11-01" }),
          round({ id: "far", eventDate: "2027-03-01" }),
          round({ id: "today", roundNumber: 3, eventDate: today, status: "closed" }),
        ],
        tryout: [
          { id: "t1", name: "ジムT", region: "関西", period: "2026/11/1〜2026/12/31" },
          { id: "t2", name: "ジムU", region: "関東", period: "2026/12/10〜2027/1/31" },
          { id: "t3", name: "ジムV", region: "関東", period: "2026/4/1〜2026/10/31" },
        ],
        ranking: [
          { id: "k1", name: "ジムK", region: "関東", period: "2026/4/1〜2027/3/31" },
          { id: "k2", name: "ジムL", region: "関西", period: "2026/4/1〜2027/3/31" },
        ],
      },
      today,
      10,
    );
    expect(items.map((i) => [i.id, i.status])).toEqual([
      ["tnfc-today", "live"],
      ["tryout-running", "live"],
      ["ranking-running", "live"],
      ["tnfc-a", "open"],
      ["tnfc-b", "soon"],
      ["tryout-t2", "soon"],
    ]);
    expect(items.find((i) => i.id === "ranking-running")).toMatchObject({
      date: "2ジムで開催中",
      place: "関東・関西",
    });
  });
});

it("buildRankingTop takes the top 3 of the highest division per gender", () => {
  const e = (id: string, score: number) => ({ id, name: `選手${id}`, score });
  const top = buildRankingTop(
    {
      global: {
        "Men‘s Division 1": [],
        "Men‘s Division 2": [e("a", 500), e("b", 900), e("c", 700), e("d", 700), e("x", 100)],
        "Women‘s Division 3": [e("w", 300)],
      },
      region: {},
      gym: {
        g1: { "Men‘s Division 2": [e("b", 400)] },
        g2: { "Men‘s Division 2": [e("b", 500)] },
      },
    } as never,
    (id) => ({ g1: "ジム1", g2: "ジム2" })[id] ?? "",
  );
  expect(top.map((g) => g.label)).toEqual(["Men‘s Division 2", "Women‘s Division 3"]);
  expect(top[0].rows.map((r) => [r.rank, r.name, r.gym])).toEqual([
    [1, "選手b", "ジム2"],
    [2, "選手c", ""],
    [2, "選手d", ""],
  ]);
  expect(buildRankingTop(null, () => "")).toEqual([]);
});
