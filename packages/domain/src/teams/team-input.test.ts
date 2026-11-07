import { describe, expect, it } from "vitest";
import { handOver, stopServing } from "./assignment";
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

describe("stopServing", () => {
  const startsOn = new Date("2026-01-01T00:00:00Z");

  it("ends the day before they stop, so they drop off at once", () => {
    const result = stopServing({ startsOn, endsOn: null }, new Date("2026-06-01T00:00:00Z"));
    expect(result).toEqual({
      ok: true,
      value: { kind: "end", endsOn: new Date("2026-05-31T00:00:00Z") },
    });
  });

  it("removes an assignment that has not really started", () => {
    expect(stopServing({ startsOn, endsOn: null }, startsOn)).toEqual({
      ok: true,
      value: { kind: "remove" },
    });
  });

  it("refuses to stop someone who already stopped", () => {
    expect(stopServing({ startsOn, endsOn: startsOn }, new Date("2026-06-01T00:00:00Z")).ok).toBe(
      false,
    );
  });
});

describe("handOver", () => {
  const lead = {
    personId: "old",
    positionId: "lead",
    startsOn: new Date("2025-01-01T00:00:00Z"),
    endsOn: null,
  };
  const capacity = { positionId: "lead", maxHolders: 1 };
  const today = new Date("2026-11-07T00:00:00Z");

  it("hands a full position to someone new on the same day", () => {
    const result = handOver(lead, "new", today, [lead], capacity);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.stop).toEqual({ kind: "end", endsOn: new Date("2026-11-06T00:00:00Z") });
    expect(result.value.incoming).toMatchObject({ personId: "new", startsOn: today });
  });

  it("refuses to hand over to the same person", () => {
    const result = handOver(lead, "old", today, [lead], capacity);
    expect(!result.ok && result.error.code).toBe("assignment.samePerson");
  });
});
