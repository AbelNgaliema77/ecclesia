import { describe, expect, it } from "vitest";
import { DEFAULT_ROLES } from "./default-roles";
import { type Actor, broadestScope, can, type Grant } from "./permissions";

const actor = (grants: readonly Grant[], overrides: Partial<Actor> = {}): Actor => ({
  userId: "u1",
  personId: "p1",
  ledTeamIds: ["t1"],
  grants,
  ...overrides,
});

describe("broadestScope", () => {
  it("returns the widest scope granted for a permission", () => {
    const grants: Grant[] = [
      { permission: "people.read", scope: "self" },
      { permission: "people.read", scope: "team" },
    ];
    expect(broadestScope(grants, "people.read")).toBe("team");
  });

  it("returns null when the permission is not granted", () => {
    expect(broadestScope([], "people.read")).toBeNull();
  });
});

describe("can", () => {
  it("allows church scope on any resource", () => {
    const a = actor([{ permission: "people.read", scope: "church" }]);
    expect(can(a, "people.read", { teamIds: ["other"] })).toBe(true);
  });

  it("limits team scope to teams the actor leads", () => {
    const a = actor([{ permission: "people.read", scope: "team" }]);
    expect(can(a, "people.read", { teamIds: ["t1"] })).toBe(true);
    expect(can(a, "people.read", { teamIds: ["t2"] })).toBe(false);
  });

  it("lets team scope include the actor's own record", () => {
    const a = actor([{ permission: "people.read", scope: "team" }]);
    expect(can(a, "people.read", { personId: "p1", teamIds: [] })).toBe(true);
  });

  it("limits self scope to the actor's own record", () => {
    const a = actor([{ permission: "people.write", scope: "self" }]);
    expect(can(a, "people.write", { personId: "p1" })).toBe(true);
    expect(can(a, "people.write", { personId: "p2", teamIds: ["t1"] })).toBe(false);
  });

  it("denies self scope when the actor has no linked person", () => {
    const a = actor([{ permission: "people.write", scope: "self" }], { personId: null });
    expect(can(a, "people.write", { personId: null })).toBe(false);
  });

  it("denies permissions that were not granted", () => {
    expect(can(actor([]), "giving.readIndividual")).toBe(false);
  });
});

describe("default roles", () => {
  it("keeps individual giving private from church admins and pastors", () => {
    const admin = actor(DEFAULT_ROLES.churchAdmin);
    const pastor = actor(DEFAULT_ROLES.seniorPastor);
    expect(can(admin, "giving.readIndividual")).toBe(false);
    expect(can(pastor, "giving.readIndividual")).toBe(false);
    expect(can(pastor, "giving.readTotals")).toBe(true);
  });

  it("does not let finance officers approve payments", () => {
    expect(can(actor(DEFAULT_ROLES.financeOfficer), "payments.approve")).toBe(false);
    expect(can(actor(DEFAULT_ROLES.treasurer), "payments.approve")).toBe(true);
  });

  it("gives ushers attendance capture only", () => {
    const usher = actor(DEFAULT_ROLES.usher);
    expect(can(usher, "attendance.capture")).toBe(true);
    expect(can(usher, "people.read")).toBe(false);
  });

  it("keeps auditors read-only", () => {
    const auditor = actor(DEFAULT_ROLES.auditor);
    const writes = DEFAULT_ROLES.auditor.filter(
      (g) => g.permission.endsWith(".write") || g.permission.endsWith(".manage"),
    );
    expect(writes).toEqual([]);
    expect(can(auditor, "audit.read")).toBe(true);
  });
});
