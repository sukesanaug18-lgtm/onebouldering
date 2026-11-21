import { describe, expect, it } from "vitest";
import { decideEntry, resolveVenuePrograms } from "@/domain/entry";
import {
  categoryForGender,
  evaluateTryout,
  recommendedChallenge,
  tryoutProblems,
  tryoutProblemsLabel,
} from "@/domain/tryout";

describe("tryout problems", () => {
  it("lists the six designated problems", () => {
    expect(tryoutProblems("MD3")).toEqual([7, 8, 9, 10, 11, 12]);
    expect(tryoutProblemsLabel("WD4")).toBe("No.1〜6");
    expect(tryoutProblemsLabel("MD2")).toBe("No.9〜14");
  });
});

describe("recommendedChallenge", () => {
  it("maps Pre-Check sends like the current app", () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => recommendedChallenge("MD", n))).toEqual([
      "MD5",
      "MD5",
      "MD5",
      "MD4",
      "MD3",
      "MD2",
    ]);
    expect([0, 1, 2, 3, 4].map((n) => recommendedChallenge("WD", n))).toEqual([
      "WD4",
      "WD4",
      "WD3",
      "WD2",
      "WD2",
    ]);
  });
});

describe("evaluateTryout", () => {
  const md = (challenged: "MD2" | "MD3" | "MD5", completedCount: number, currentDivision: string) =>
    evaluateTryout({ challenged, completedCount, currentDivision });

  it("promotes on 6 sends, including MD2 → MD1", () => {
    const r = md("MD2", 6, "Men‘s Division 2");
    expect(r.judgment).toBe("PROMOTION");
    expect(r.newDivision).toBe("Men‘s Division 1");
    expect(r.resetCompetitionPoints).toBe(true);
  });

  it("keeps on 4–5 sends; a first-timer gets INITIAL", () => {
    expect(md("MD3", 5, "MD3").judgment).toBe("KEEP");
    const first = md("MD3", 4, "UNDECIDED");
    expect(first.judgment).toBe("INITIAL");
    expect(first.newDivision).toBe("Men‘s Division 3");
    expect(first.resetCompetitionPoints).toBe(false);
  });

  it("demotes on 0–3 sends except at the lowest Division", () => {
    expect(md("MD3", 3, "MD3").newDivision).toBe("Men‘s Division 4");
    expect(md("MD3", 3, "MD3").judgment).toBe("DEMOTION");
    expect(md("MD5", 0, "MD5").judgment).toBe("KEEP");
    const wd = evaluateTryout({ challenged: "WD4", completedCount: 1, currentDivision: "WD4" });
    expect(wd.newDivision).toBe("Women‘s Division 4");
  });

  it("does not reset competition points for a first-time promotion", () => {
    const r = md("MD3", 6, "UNDECIDED");
    expect(r.judgment).toBe("PROMOTION");
    expect(r.newDivision).toBe("Men‘s Division 2");
    expect(r.resetCompetitionPoints).toBe(false);
  });

  it("clamps the send count to 0–6", () => {
    expect(md("MD3", 9, "MD3").completedCount).toBe(6);
    expect(md("MD3", -2, "MD3").completedCount).toBe(0);
  });
});

describe("categoryForGender", () => {
  it("fixes the category for 男性 / 女性 and lets others choose", () => {
    expect(categoryForGender("男性")).toBe("MD");
    expect(categoryForGender("女性")).toBe("WD");
    expect(categoryForGender("その他")).toBeNull();
  });
});

describe("decideEntry", () => {
  const both = resolveVenuePrograms({});
  const rankingOnly = resolveVenuePrograms({ programs: { hasTryout: false, hasRanking: true } });
  const tryoutOnly = resolveVenuePrograms({ programs: { hasTryout: true, hasRanking: false } });

  it("asks logged-out players to log in", () => {
    expect(decideEntry({ loggedIn: false, programs: both }).kind).toBe("login");
  });

  it("sends undecided players to Tryout, or elsewhere when there is none", () => {
    expect(decideEntry({ loggedIn: true, division: "UNDECIDED", programs: both })).toEqual({
      kind: "choose",
      options: [{ kind: "tryout", recommended: true }],
    });
    expect(decideEntry({ loggedIn: true, division: "UNDECIDED", programs: rankingOnly }).kind).toBe(
      "needs-tryout-elsewhere",
    );
  });

  it("puts Ranking first for confirmed players", () => {
    expect(decideEntry({ loggedIn: true, division: "MD3", programs: both })).toEqual({
      kind: "choose",
      options: [
        { kind: "score", recommended: true },
        { kind: "tryout", recommended: false },
      ],
    });
    expect(decideEntry({ loggedIn: true, division: "MD3", programs: tryoutOnly })).toEqual({
      kind: "choose",
      options: [{ kind: "tryout", recommended: true }],
    });
  });

  it("never offers Tryout to U categories", () => {
    expect(decideEntry({ loggedIn: true, division: "U-12M", programs: tryoutOnly }).kind).toBe(
      "nothing",
    );
    expect(decideEntry({ loggedIn: true, division: "U-12M", programs: both })).toEqual({
      kind: "choose",
      options: [{ kind: "score", recommended: true }],
    });
  });

  it("treats venues without programs as running both", () => {
    expect(resolveVenuePrograms({ period: "4/1〜5/31" })).toEqual({
      hasTryout: true,
      tryoutPeriod: "4/1〜5/31",
      hasRanking: true,
      rankingPeriod: "4/1〜5/31",
    });
  });
});

describe("tnfcControlCategory", () => {
  it("maps Divisions to TNFC Control names", async () => {
    const { tnfcControlCategory } = await import("@/domain/tnfc");
    expect(tnfcControlCategory("Men‘s Division 2")).toBe("Division 2");
    expect(tnfcControlCategory("Women‘s Division 4")).toBe("Women's Division 4");
    expect(tnfcControlCategory("UNDECIDED")).toBe("未確定");
  });
});
