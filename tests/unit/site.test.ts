import { describe, expect, it } from "vitest";
import { SITE_NAME, SITE_URL } from "@/lib/site";

describe("site constants", () => {
  it("has the site name", () => {
    expect(SITE_NAME).toBe("ONE Bouldering");
  });

  it("falls back to localhost when NEXT_PUBLIC_SITE_URL is unset", () => {
    expect(SITE_URL).toMatch(/^https?:\/\//);
  });
});
