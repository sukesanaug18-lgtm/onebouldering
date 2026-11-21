import { describe, expect, it } from "vitest";
import {
  ageAtFiscalYearEnd,
  nextLicenseNo,
  recommendUCategory,
  safeRedirectPath,
} from "@/domain/member";

describe("U category", () => {
  // Same cases as the current app (tests/tnfcLogic.test.ts), season 2027.
  it("matches the current app", () => {
    expect(recommendUCategory("2016-05-01", "男性", "2027")).toBe("U-10");
    expect(recommendUCategory("2014-05-01", "女性", "2027")).toBe("U-12W");
    expect(recommendUCategory("2000-05-01", "男性", "2027")).toBeNull();
  });

  it("uses April 1 as the cutoff", () => {
    // Born 2011-04-01 → 16 on 2027-04-01 → general Division
    expect(ageAtFiscalYearEnd("2011-04-01", 2026)).toBe(16);
    expect(recommendUCategory("2011-04-01", "男性", "2027")).toBeNull();
    // Born 2011-04-02 → 15 → U-15
    expect(recommendUCategory("2011-04-02", "男性", "2027")).toBe("U-15M");
  });

  it("rejects invalid dates", () => {
    expect(recommendUCategory("2015/13/01", "男性", "2027")).toBeNull();
    expect(recommendUCategory("", "男性", "2027")).toBeNull();
  });
});

describe("license numbers", () => {
  it("continues after the highest numeric id", () => {
    expect(nextLicenseNo(["10376", "20005", "abc"])).toBe("20006");
    expect(nextLicenseNo([])).toBe("20001");
    expect(nextLicenseNo(["9000001"])).toBe("20001");
  });
});

describe("redirect after login", () => {
  it("allows only internal paths", () => {
    expect(safeRedirectPath("/entry?venue=bolz")).toBe("/entry?venue=bolz");
    expect(safeRedirectPath("https://evil.example")).toBe("/mypage");
    expect(safeRedirectPath("//evil.example")).toBe("/mypage");
    expect(safeRedirectPath("/\\evil.example")).toBe("/mypage");
    expect(safeRedirectPath(undefined)).toBe("/mypage");
  });
});
