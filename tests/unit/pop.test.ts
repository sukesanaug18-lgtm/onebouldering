import { expect, it } from "vitest";
import { popPages } from "@/domain/pop";

it("groups Ranking gyms by region, north to south, with logos matched by name", () => {
  const v = (
    id: string,
    region: string,
    o: Partial<{ visible: boolean; hasRanking: boolean }> = {},
  ) => ({
    id,
    name: id === "a" ? "Climbing JAM" : `Gym ${id}`,
    region,
    visible: true,
    hasRanking: true,
    period: id === "b" ? "" : "2026/6/1〜",
    ...o,
  });
  const pages = popPages(
    [
      v("a", "関東"),
      v("b", "北海道"),
      v("c", "関東", { hasRanking: false }),
      v("d", "東北", { visible: false }),
    ],
    [{ name: "climbing  jam", logo: "/gym-logos/04-climbing-jam.png" }],
  );
  expect(pages.map((p) => [p.region, p.venues.map((x) => x.id)])).toEqual([
    ["北海道", ["b"]],
    ["関東", ["a"]],
  ]);
  expect(pages[0].venues[0].period).toBe("日付未定");
  expect(pages[1].venues[0].logo?.src).toBe("/gym-logos/04-climbing-jam.png");
  expect(popPages([v("a", "関東")], [], "東北")).toEqual([]);
});
