import type { Grant, Permission, Scope } from "./permissions";

export const DEFAULT_ROLE_KEYS = [
  "churchAdmin",
  "seniorPastor",
  "financeOfficer",
  "treasurer",
  "teamLeader",
  "usher",
  "inventoryManager",
  "member",
  "auditor",
] as const;

export type DefaultRoleKey = (typeof DEFAULT_ROLE_KEYS)[number];

const all = (...permissions: Permission[]): Grant[] =>
  permissions.map((permission) => ({ permission, scope: "church" }));

const scoped = (scope: Scope, ...permissions: Permission[]): Grant[] =>
  permissions.map((permission) => ({ permission, scope }));

export const DEFAULT_ROLES: Record<DefaultRoleKey, readonly Grant[]> = {
  churchAdmin: [
    ...all(
      "settings.manage",
      "users.manage",
      "people.read",
      "people.write",
      "teams.read",
      "teams.write",
      "attendance.capture",
      "attendance.read",
      "reports.read",
      "giving.readTotals",
      "payments.request",
      "budgets.read",
      "inventory.read",
      "audit.read",
    ),
  ],
  seniorPastor: [
    ...all(
      "people.read",
      "teams.read",
      "attendance.read",
      "reports.read",
      "giving.readTotals",
      "payments.request",
      "payments.approve",
      "budgets.read",
      "budgets.manage",
      "inventory.read",
      "audit.read",
    ),
  ],
  financeOfficer: [
    ...all(
      "people.read",
      "giving.capture",
      "giving.readTotals",
      "giving.readIndividual",
      "payments.request",
      "budgets.read",
      "inventory.read",
      "reports.read",
    ),
  ],
  treasurer: [
    ...all(
      "giving.readTotals",
      "giving.readIndividual",
      "payments.approve",
      "budgets.read",
      "budgets.manage",
      "reports.read",
      "audit.read",
    ),
  ],
  teamLeader: [
    ...scoped(
      "team",
      "people.read",
      "people.write",
      "teams.read",
      "teams.write",
      "attendance.capture",
      "attendance.read",
      "payments.request",
      "budgets.read",
    ),
    ...all("inventory.borrow"),
  ],
  usher: [...all("attendance.capture")],
  inventoryManager: [...all("inventory.read", "inventory.manage", "payments.request")],
  member: [
    ...scoped("self", "people.read", "people.write", "giving.readIndividual"),
    ...all("inventory.borrow"),
  ],
  auditor: [
    ...all(
      "people.read",
      "teams.read",
      "attendance.read",
      "reports.read",
      "giving.readTotals",
      "giving.readIndividual",
      "budgets.read",
      "inventory.read",
      "audit.read",
    ),
  ],
};
