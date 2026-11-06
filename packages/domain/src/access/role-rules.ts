import { z } from "zod";
import { localizedTextSchema } from "../shared/localized";
import { domainError, err, ok, type Result } from "../shared/result";
import { type Grant, PERMISSIONS, type Permission, SCOPES, type Scope } from "./permissions";

export const ALLOWED_SCOPES: Record<Permission, readonly Scope[]> = {
  "settings.manage": ["church"],
  "users.manage": ["church"],
  "people.read": ["church", "team", "self"],
  "people.write": ["church", "team", "self"],
  "teams.read": ["church", "team"],
  "teams.write": ["church", "team"],
  "attendance.capture": ["church", "team"],
  "attendance.read": ["church", "team"],
  "reports.read": ["church"],
  "giving.capture": ["church"],
  "giving.readTotals": ["church"],
  "giving.readIndividual": ["church", "self"],
  "payments.request": ["church", "team"],
  "payments.approve": ["church"],
  "budgets.read": ["church", "team"],
  "budgets.manage": ["church"],
  "inventory.read": ["church"],
  "inventory.manage": ["church"],
  "inventory.borrow": ["church"],
  "audit.read": ["church"],
};

export const PERMISSION_GROUPS: Record<string, readonly Permission[]> = {
  administration: ["settings.manage", "users.manage", "audit.read", "reports.read"],
  people: ["people.read", "people.write", "teams.read", "teams.write"],
  attendance: ["attendance.capture", "attendance.read"],
  finance: [
    "giving.capture",
    "giving.readTotals",
    "giving.readIndividual",
    "payments.request",
    "payments.approve",
    "budgets.read",
    "budgets.manage",
  ],
  inventory: ["inventory.read", "inventory.manage", "inventory.borrow"],
};

const grantSchema = z.object({
  permission: z.enum(PERMISSIONS),
  scope: z.enum(SCOPES),
});

export const roleInputSchema = z
  .object({
    name: localizedTextSchema(60),
    grants: z.array(grantSchema).max(PERMISSIONS.length),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<Permission>();
    value.grants.forEach((grant, index) => {
      if (seen.has(grant.permission)) {
        ctx.addIssue({ code: "custom", message: "duplicatePermission", path: ["grants", index] });
      }
      seen.add(grant.permission);
      if (!ALLOWED_SCOPES[grant.permission].includes(grant.scope)) {
        ctx.addIssue({ code: "custom", message: "invalidScope", path: ["grants", index] });
      }
    });
  });

export type RoleInput = z.output<typeof roleInputSchema>;

export const managesUsers = (grants: readonly Grant[]): boolean =>
  grants.some((g) => g.permission === "users.manage" && g.scope === "church");

export type MemberAccess = { readonly membershipId: string; readonly managesUsers: boolean };

export type MembershipChange =
  | { readonly kind: "remove"; readonly membershipId: string }
  | { readonly kind: "changeRole"; readonly membershipId: string; readonly managesUsers: boolean };

export const guardLastAdmin = (
  members: readonly MemberAccess[],
  change: MembershipChange,
): Result<true> => {
  const remaining = members.filter((member) => {
    if (member.membershipId !== change.membershipId) return member.managesUsers;
    return change.kind === "changeRole" ? change.managesUsers : false;
  });
  return remaining.length > 0
    ? ok(true)
    : err(
        domainError(
          "members.lastAdmin",
          "The church needs at least one person who can manage users",
        ),
      );
};
