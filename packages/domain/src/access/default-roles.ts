import { type Grant, PERMISSIONS, type Permission, type Scope } from "./permissions";

export const DEFAULT_ROLE_KEYS = ["pastor", "churchAdmin", "teamLeader"] as const;

export type DefaultRoleKey = (typeof DEFAULT_ROLE_KEYS)[number];

const scoped = (scope: Scope, ...permissions: Permission[]): Grant[] =>
  permissions.map((permission) => ({ permission, scope }));

const fullAccess: readonly Grant[] = PERMISSIONS.map((permission) => ({
  permission,
  scope: "church",
}));

export const DEFAULT_ROLES: Record<DefaultRoleKey, readonly Grant[]> = {
  pastor: fullAccess,
  churchAdmin: fullAccess,
  teamLeader: [
    ...scoped("church", "people.read", "teams.read"),
    ...scoped("team", "people.write", "teams.write", "payments.request"),
  ],
};

export const RETIRED_ROLE_KEYS = [
  "seniorPastor",
  "financeOfficer",
  "treasurer",
  "usher",
  "inventoryManager",
  "member",
  "auditor",
] as const;

export const RETIRED_ROLE_REPLACEMENT: Record<(typeof RETIRED_ROLE_KEYS)[number], DefaultRoleKey> =
  {
    seniorPastor: "pastor",
    financeOfficer: "teamLeader",
    treasurer: "teamLeader",
    usher: "teamLeader",
    inventoryManager: "teamLeader",
    member: "teamLeader",
    auditor: "teamLeader",
  };

export const FINANCE_PERMISSIONS = [
  "giving.capture",
  "giving.readTotals",
  "giving.readIndividual",
  "payments.request",
  "payments.approve",
  "budgets.read",
  "budgets.manage",
  "finance.manage",
] as const satisfies readonly Permission[];

export const FINANCE_TEAM_GRANTS: readonly Grant[] = scoped("church", ...FINANCE_PERMISSIONS);

export const TWO_FACTOR_PERMISSIONS: ReadonlySet<Permission> = new Set<Permission>([
  "giving.capture",
  "giving.readTotals",
  "giving.readIndividual",
  "payments.approve",
  "budgets.manage",
  "finance.manage",
]);

const SCOPE_ORDER: Record<Scope, number> = { self: 1, team: 2, church: 3 };

export const effectiveGrants = (
  roleGrants: readonly Grant[],
  leadsFinanceTeam: boolean,
): readonly Grant[] => {
  if (!leadsFinanceTeam) return roleGrants;
  const merged = new Map<Permission, Grant>();
  for (const grant of [...roleGrants, ...FINANCE_TEAM_GRANTS]) {
    const current = merged.get(grant.permission);
    if (!current || SCOPE_ORDER[grant.scope] > SCOPE_ORDER[current.scope])
      merged.set(grant.permission, grant);
  }
  return [...merged.values()];
};
