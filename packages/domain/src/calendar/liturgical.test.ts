import { describe, expect, it } from "vitest";
import { easterSunday, seasonForMonth } from "./liturgical";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("easterSunday", () => {
  it("matches known Easter dates", () => {
    expect(iso(easterSunday(2024))).toBe("2024-03-31");
    expect(iso(easterSunday(2025))).toBe("2025-04-20");
    expect(iso(easterSunday(2026))).toBe("2026-04-05");
    expect(iso(easterSunday(2027))).toBe("2027-03-28");
  });
});

describe("seasonForMonth", () => {
  it("assigns the season that covers most of the month", () => {
    expect(seasonForMonth("2026-03")).toBe("lent");
    expect(seasonForMonth("2026-04")).toBe("easter");
    expect(seasonForMonth("2026-05")).toBe("easter");
    expect(seasonForMonth("2026-12")).toBe("advent");
  });

  it("leaves ordinary months unmarked", () => {
    expect(seasonForMonth("2026-08")).toBeNull();
    expect(seasonForMonth("2026-10")).toBeNull();
  });
});
