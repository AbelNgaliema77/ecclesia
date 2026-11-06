import { describe, expect, it } from "vitest";
import { lastNMonthKeys, rangesOverlap, zonedDateTimeToUtc } from "./dates";

describe("zonedDateTimeToUtc", () => {
  it("converts Johannesburg local time to UTC", () => {
    expect(zonedDateTimeToUtc("2026-11-08", "09:00", "Africa/Johannesburg").toISOString()).toBe(
      "2026-11-08T07:00:00.000Z",
    );
  });

  it("handles daylight saving time zones", () => {
    expect(zonedDateTimeToUtc("2026-07-05", "10:00", "Europe/Paris").toISOString()).toBe(
      "2026-07-05T08:00:00.000Z",
    );
    expect(zonedDateTimeToUtc("2026-01-04", "10:00", "Europe/Paris").toISOString()).toBe(
      "2026-01-04T09:00:00.000Z",
    );
  });

  it("rejects invalid input", () => {
    expect(() => zonedDateTimeToUtc("not-a-date", "10:00", "UTC")).toThrow();
  });
});

describe("lastNMonthKeys", () => {
  it("returns months oldest first, crossing years", () => {
    expect(lastNMonthKeys(new Date("2026-02-10T00:00:00Z"), 3)).toEqual([
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
  });
});

describe("rangesOverlap", () => {
  it("treats open-ended ranges as ongoing", () => {
    const a = { start: new Date("2026-01-01"), end: null };
    const b = { start: new Date("2030-01-01"), end: new Date("2030-02-01") };
    expect(rangesOverlap(a, b)).toBe(true);
  });
});
