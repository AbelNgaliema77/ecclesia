import { describe, expect, it } from "vitest";
import { DEFAULT_ROLES } from "./default-roles";
import { PERMISSIONS } from "./permissions";
import {
  ALLOWED_SCOPES,
  guardLastAdmin,
  managesUsers,
  PERMISSION_GROUPS,
  roleInputSchema,
} from "./role-rules";

describe("roleInputSchema", () => {
  it("accepts a valid custom role and fills French from English", () => {
    const parsed = roleInputSchema.parse({
      name: { en: "Secretary", fr: "" },
      grants: [{ permission: "people.read", scope: "church" }],
    });
    expect(parsed.name.fr).toBe("Secretary");
  });

  it("rejects duplicate permissions", () => {
    const result = roleInputSchema.safeParse({
      name: { en: "X" },
      grants: [
        { permission: "people.read", scope: "church" },
        { permission: "people.read", scope: "team" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects scopes that make no sense for a permission", () => {
    const result = roleInputSchema.safeParse({
      name: { en: "X" },
      grants: [{ permission: "payments.approve", scope: "self" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("permission catalogue", () => {
  it("groups every permission exactly once", () => {
    const grouped = Object.values(PERMISSION_GROUPS).flat();
    expect([...grouped].sort()).toEqual([...PERMISSIONS].sort());
  });

  it("keeps every default role within the allowed scopes", () => {
    for (const grants of Object.values(DEFAULT_ROLES)) {
      for (const grant of grants) {
        expect(ALLOWED_SCOPES[grant.permission]).toContain(grant.scope);
      }
    }
  });
});

describe("guardLastAdmin", () => {
  const members = [
    { membershipId: "a", managesUsers: true },
    { membershipId: "b", managesUsers: false },
  ];

  it("blocks removing the only admin", () => {
    expect(guardLastAdmin(members, { kind: "remove", membershipId: "a" }).ok).toBe(false);
  });

  it("blocks demoting the only admin", () => {
    expect(
      guardLastAdmin(members, { kind: "changeRole", membershipId: "a", managesUsers: false }).ok,
    ).toBe(false);
  });

  it("allows changes that keep an admin", () => {
    expect(guardLastAdmin(members, { kind: "remove", membershipId: "b" }).ok).toBe(true);
    expect(
      guardLastAdmin([...members, { membershipId: "c", managesUsers: true }], {
        kind: "remove",
        membershipId: "a",
      }).ok,
    ).toBe(true);
  });

  it("recognises church-wide user management", () => {
    expect(managesUsers(DEFAULT_ROLES.churchAdmin)).toBe(true);
    expect(managesUsers(DEFAULT_ROLES.pastor)).toBe(true);
    expect(managesUsers(DEFAULT_ROLES.teamLeader)).toBe(false);
  });
});
