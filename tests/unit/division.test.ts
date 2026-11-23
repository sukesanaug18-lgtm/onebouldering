import { describe, expect, it } from "vitest";
import { divisionName, UNDECIDED_DIVISION } from "@/domain/division";

describe("divisionName", () => {
  it("shows the official name for short codes and other spellings", () => {
    expect(divisionName("MD3")).toBe("Men‘s Division 3");
    expect(divisionName("WD2")).toBe("Women‘s Division 2");
    expect(divisionName("Men's Division 1")).toBe("Men‘s Division 1");
  });
  it("keeps U categories and shows 未確定 for undecided", () => {
    expect(divisionName("U-15M")).toBe("U-15M");
    expect(divisionName(UNDECIDED_DIVISION)).toBe("未確定");
  });
});
