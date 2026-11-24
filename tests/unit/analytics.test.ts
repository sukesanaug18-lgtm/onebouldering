import { expect, it } from "vitest";
import { analyticsCsv, computeSeasonAnalytics, seasonMonths } from "@/domain/analytics";

it("counts players per gym and Division, send rates and hours in Japan time", () => {
  const sheet = (userId: string, venueId: string, nos: number[], status = "Approved", at = "") => ({
    seasonId: "2027",
    userId,
    venueId,
    status,
    totalPoints: nos.reduce((s, n) => s + n, 0),
    problems: Object.fromEntries(nos.map((n) => [String(n), "Y"])),
    submittedAt: at,
  });
  const a = computeSeasonAnalytics({
    seasonId: "2027",
    users: [
      { id: "1", division: "MD3", createdAt: "2026-05-10T03:00:00Z" },
      { id: "2", division: "Men‘s Division 3" },
      { id: "3", division: "WD2" },
    ],
    scores: [
      sheet("1", "a", [1, 2], "Approved", "2026-06-01T15:30:00Z"), // 00:30 JST on 6/2
      sheet("1", "b", [1], "Pending"),
      sheet("3", "a", [3], "Rejected"),
      { ...sheet("2", "a", [1]), seasonId: "2026" },
    ],
    tryouts: [{ seasonId: "2027" }, { seasonId: "2026" }],
    venues: [
      { id: "a", name: "ジムA", region: "関東" },
      { id: "b", name: "ジムB", region: "東北" },
    ],
  });
  expect([a.members, a.activePlayers, a.sheets, a.pending, a.tryouts]).toEqual([3, 1, 2, 1, 1]);
  expect(a.gymsPerPlayer).toBe(2);
  expect(a.venues.map((v) => [v.id, v.players, v.avgPoints])).toEqual([
    ["a", 1, 3],
    ["b", 1, 0], // Pending only: no approved points yet
  ]);
  expect(a.divisions.map((d) => [d.division, d.registered, d.active])).toEqual([
    ["Men‘s Division 3", 2, 1],
    ["Women‘s Division 2", 1, 0],
  ]);
  expect(a.problems.rates[0]).toEqual({ no: 1, sent: 2, rate: 1 });
  expect(a.hours[0]).toBe(1);
  expect(a.months.find((m) => m.month === "2026-06")?.sheets).toBe(1);
  expect(a.newMembers).toBe(1);
  expect(seasonMonths("2027")[0]).toBe("2026-04");
  expect(seasonMonths("2027")[11]).toBe("2027-03");
  expect(analyticsCsv(a, "venues")).toContain("a,ジムA,関東,1,1,0,3");
});
