import { describe, expect, it } from "vitest";
import { type AssignmentPeriod, validateAssignment } from "./assignment";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

const existing: AssignmentPeriod[] = [
  { personId: "p1", positionId: "lead", startsOn: d("2026-01-01"), endsOn: null },
];

describe("validateAssignment", () => {
  it("rejects an end date before the start date", () => {
    const r = validateAssignment(
      { personId: "p2", positionId: "lead", startsOn: d("2026-05-01"), endsOn: d("2026-04-01") },
      [],
      { positionId: "lead", maxHolders: null },
    );
    expect(r.ok).toBe(false);
  });

  it("rejects the same person holding the same position twice", () => {
    const r = validateAssignment(
      { personId: "p1", positionId: "lead", startsOn: d("2026-06-01"), endsOn: null },
      existing,
      { positionId: "lead", maxHolders: null },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("assignment.alreadyHeld");
  });

  it("enforces position capacity", () => {
    const r = validateAssignment(
      { personId: "p2", positionId: "lead", startsOn: d("2026-06-01"), endsOn: null },
      existing,
      { positionId: "lead", maxHolders: 1 },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("assignment.positionFull");
  });

  it("allows a new holder once the previous one has ended", () => {
    const ended: AssignmentPeriod[] = [
      { personId: "p1", positionId: "lead", startsOn: d("2025-01-01"), endsOn: d("2025-12-31") },
    ];
    const r = validateAssignment(
      { personId: "p2", positionId: "lead", startsOn: d("2026-01-01"), endsOn: null },
      ended,
      { positionId: "lead", maxHolders: 1 },
    );
    expect(r.ok).toBe(true);
  });
});
