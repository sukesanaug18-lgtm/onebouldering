import { expect, it } from "vitest";
import { computeRollover, rolloverMessage } from "@/domain/rollover";

const m = (id: string, division: string, birthDate = "", gender = "男性") => ({
  id,
  name: `選手${id}`,
  gender,
  division,
  birthDate,
});

it("resets lower Divisions and moves U categories by age for the next season", () => {
  // Next season "2028" = fiscal 2027; age is taken on 2028-04-01.
  const { changes, missingBirthDate } = computeRollover(
    [
      m("1", "Men‘s Division 5"),
      m("2", "MD4"),
      m("3", "Men‘s Division 3"),
      m("4", "Women‘s Division 3", "", "女性"),
      m("5", "U-10", "2017-03-01"), // 11 on 2028-04-01: U-12M
      m("6", "U-12W", "2016-04-01", "女性"), // 12 on 2028-04-01 (born on Apr 1): stays U-12W
      m("7", "U-15M", "2012-05-01"), // 15 → 15: stays
      m("8", "U-15W", "2012-03-31", "女性"), // 16 on 2028-04-01: graduates
      m("9", "U-8"),
      m("10", "UNDECIDED"),
      m("11", "U-10", "2017-06-01"), // still 10: no change
      m("12", "U-8", "2030-01-01"), // implausible: manual check
    ],
    "2028",
  );
  expect(changes.map((c) => [c.userId, c.to, c.reason])).toEqual([
    ["2", "UNDECIDED", "division_reset"],
    ["1", "UNDECIDED", "division_reset"],
    ["4", "UNDECIDED", "division_reset"],
    ["5", "U-12M", "u_category_advance"],
    ["8", "UNDECIDED", "u15_graduated"],
  ]);
  expect(missingBirthDate.map((x) => x.id)).toEqual(["9", "12"]);
  expect(rolloverMessage(changes[0], "2027–28")).toContain("Tryout");
});
