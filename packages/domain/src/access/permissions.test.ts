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
  it("gives pastors and church admins full access", () => {
    for (const role of [DEFAULT_ROLES.pastor, DEFAULT_ROLES.churchAdmin]) {
      const admin = actor(role);
      expect(can(admin, "settings.manage")).toBe(true);
      expect(can(admin, "giving.readIndividual")).toBe(true);
      expect(can(admin, "attendance.capture")).toBe(true);
    }
  });

  it("lets team leaders see everyone but edit only their own team", () => {
    const leader = actor(DEFAULT_ROLES.teamLeader);
    expect(can(leader, "people.read", { teamIds: ["other"] })).toBe(true);
    expect(can(leader, "people.write", { teamIds: ["t1"] })).toBe(true);
    expect(can(leader, "people.write", { teamIds: ["other"] })).toBe(false);
    expect(can(leader, "teams.write", { teamIds: ["other"] })).toBe(false);
  });

  it("keeps team leaders out of attendance, finance and settings", () => {
    const leader = actor(DEFAULT_ROLES.teamLeader);
    expect(can(leader, "attendance.read")).toBe(false);
    expect(can(leader, "attendance.capture")).toBe(false);
    expect(can(leader, "giving.readTotals")).toBe(false);
    expect(can(leader, "settings.manage")).toBe(false);
    expect(can(leader, "users.manage")).toBe(false);
  });
});
