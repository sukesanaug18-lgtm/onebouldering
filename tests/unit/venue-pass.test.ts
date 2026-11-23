import { describe, expect, it } from "vitest";
import {
  addPass,
  distanceMeters,
  endOfDayJst,
  hasPass,
  isLatLng,
  isNearVenue,
} from "@/domain/venue-pass";

const gym = { lat: 35.6812, lng: 139.7671 }; // Tokyo Station

describe("distanceMeters", () => {
  it("measures short and long distances", () => {
    expect(distanceMeters(gym, gym)).toBe(0);
    // 0.001° of latitude is about 111 m.
    expect(distanceMeters(gym, { lat: 35.6822, lng: 139.7671 })).toBeCloseTo(111, 0);
    // Tokyo → Osaka is about 400 km.
    const km = distanceMeters(gym, { lat: 34.7025, lng: 135.4959 }) / 1000;
    expect(km).toBeGreaterThan(390);
    expect(km).toBeLessThan(410);
  });
});

describe("isNearVenue", () => {
  it("accepts within 300 m and adds GPS accuracy up to 200 m", () => {
    const at250 = { lat: gym.lat + 0.00225, lng: gym.lng };
    const at450 = { lat: gym.lat + 0.00405, lng: gym.lng };
    expect(isNearVenue(at250, 10, gym)).toBe(true);
    expect(isNearVenue(at450, 10, gym)).toBe(false);
    expect(isNearVenue(at450, 180, gym)).toBe(true);
    // Accuracy beyond 200 m does not stretch the radius further.
    expect(isNearVenue({ lat: gym.lat + 0.0054, lng: gym.lng }, 5000, gym)).toBe(false);
  });
});

it("isLatLng rejects missing, out-of-range and 0,0 positions", () => {
  expect(isLatLng(gym)).toBe(true);
  expect(isLatLng({ lat: 0, lng: 0 })).toBe(false);
  expect(isLatLng({ lat: 91, lng: 0 })).toBe(false);
  expect(isLatLng(null)).toBe(false);
});

describe("passes", () => {
  const morning = Date.parse("2026-11-23T01:00:00Z"); // 10:00 JST
  it("expire at midnight Japan time", () => {
    expect(new Date(endOfDayJst(morning)).toISOString()).toBe("2026-11-23T15:00:00.000Z");
    // 23:30 JST on the 23rd still ends at the same midnight.
    expect(endOfDayJst(Date.parse("2026-11-23T14:30:00Z"))).toBe(endOfDayJst(morning));
  });
  it("are kept per venue and drop expired ones", () => {
    const p = addPass({ old: morning - 1, other: morning + 1000 }, "gym-a", morning);
    expect(Object.keys(p).sort()).toEqual(["gym-a", "other"]);
    expect(hasPass(p, "gym-a", morning)).toBe(true);
    expect(hasPass(p, "gym-b", morning)).toBe(false);
    expect(hasPass(p, "gym-a", endOfDayJst(morning))).toBe(false);
  });
});
