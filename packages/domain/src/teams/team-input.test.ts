import { describe, expect, it } from "vitest";
import { endAssignmentOn } from "./assignment";
import { positionInputSchema, teamInputSchema } from "./team-input";

describe("teamInputSchema", () => {
  it("requires an English name and a preset colour", () => {
    expect(teamInputSchema.safeParse({ name: { en: "" }, color: "#3987e5" }).success).toBe(false);
    expect(
      teamInputSchema.parse({ name: { en: "Media" }, color: "#3987e5" }).description,
    ).toBeNull();
  });
});

describe("positionInputSchema", () => {
  it("reads checkbox and empty capacity from forms", () => {
    expect(
      positionInputSchema.parse({ name: { en: "Lead" }, isLeadership: "on", maxHolders: "" }),
    ).toEqual({
      name: { en: "Lead", fr: "Lead" },
      isLeadership: true,
      maxHolders: null,
    });
  });
});

describe("endAssignmentOn", () => {
  const startsOn = new Date("2026-01-01T00:00:00Z");

  it("ends an active assignment", () => {
    expect(endAssignmentOn({ startsOn, endsOn: null }, new Date("2026-06-01T00:00:00Z")).ok).toBe(
      true,
    );
  });

  it("refuses to end before it started or twice", () => {
    expect(endAssignmentOn({ startsOn, endsOn: null }, new Date("2025-12-01T00:00:00Z")).ok).toBe(
      false,
    );
    expect(
      endAssignmentOn({ startsOn, endsOn: startsOn }, new Date("2026-06-01T00:00:00Z")).ok,
    ).toBe(false);
  });
});
