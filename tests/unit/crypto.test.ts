import { describe, expect, it } from "vitest";
import { hashPin, safeEqual, signToken, verifyPin, verifyToken } from "@/server/crypto";

describe("PIN hashing", () => {
  it("verifies the right PIN and rejects others", async () => {
    const stored = await hashPin("1234");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain("1234");
    expect(await verifyPin("1234", stored)).toBe(true);
    expect(await verifyPin("4321", stored)).toBe(false);
  });

  it("uses a new salt each time", async () => {
    expect(await hashPin("1234")).not.toBe(await hashPin("1234"));
  });

  it("rejects malformed hashes", async () => {
    expect(await verifyPin("1234", "1234")).toBe(false);
    expect(await verifyPin("1234", "")).toBe(false);
  });
});

describe("signed tokens", () => {
  const secret = "x".repeat(32);

  it("round-trips a payload", () => {
    const t = signToken({ uid: "20001", exp: 1 }, secret);
    expect(verifyToken(t, secret)).toEqual({ uid: "20001", exp: 1 });
  });

  it("rejects a tampered payload or another secret", () => {
    const t = signToken({ uid: "20001", exp: 1 }, secret);
    const [, sig] = t.split(".");
    const forged = `${Buffer.from(JSON.stringify({ uid: "10001", exp: 1 })).toString("base64url")}.${sig}`;
    expect(verifyToken(forged, secret)).toBeNull();
    expect(verifyToken(t, "y".repeat(32))).toBeNull();
    expect(verifyToken(undefined, secret)).toBeNull();
    expect(verifyToken("garbage", secret)).toBeNull();
  });

  it("compares strings in constant time", () => {
    expect(safeEqual("1234", "1234")).toBe(true);
    expect(safeEqual("1234", "12345")).toBe(false);
  });
});
