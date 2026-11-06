export const PERMISSIONS = [
  "settings.manage",
  "users.manage",
  "people.read",
  "people.write",
  "teams.read",
  "teams.write",
  "attendance.capture",
  "attendance.read",
  "reports.read",
  "giving.capture",
  "giving.readTotals",
  "giving.readIndividual",
  "payments.request",
  "payments.approve",
  "budgets.read",
  "budgets.manage",
  "inventory.read",
  "inventory.manage",
  "inventory.borrow",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const SCOPES = ["church", "team", "self"] as const;

export type Scope = (typeof SCOPES)[number];

export type Grant = { readonly permission: Permission; readonly scope: Scope };

const SCOPE_RANK: Record<Scope, number> = { self: 1, team: 2, church: 3 };

export const isPermission = (value: string): value is Permission =>
  (PERMISSIONS as readonly string[]).includes(value);

export const isScope = (value: string): value is Scope =>
  (SCOPES as readonly string[]).includes(value);

export const broadestScope = (grants: readonly Grant[], permission: Permission): Scope | null => {
  let best: Scope | null = null;
  for (const grant of grants) {
    if (grant.permission !== permission) continue;
    if (best === null || SCOPE_RANK[grant.scope] > SCOPE_RANK[best]) best = grant.scope;
  }
  return best;
};

export type Actor = {
  readonly userId: string;
  readonly personId: string | null;
  readonly ledTeamIds: readonly string[];
  readonly grants: readonly Grant[];
};

export type ProtectedResource = {
  readonly teamIds?: readonly string[];
  readonly personId?: string | null;
};

export const can = (
  actor: Actor,
  permission: Permission,
  resource?: ProtectedResource,
): boolean => {
  const scope = broadestScope(actor.grants, permission);
  if (scope === null) return false;
  if (scope === "church" || resource === undefined) return true;

  const teamMatch = resource.teamIds?.some((teamId) => actor.ledTeamIds.includes(teamId)) ?? false;
  const selfMatch =
    actor.personId !== null && resource.personId != null && resource.personId === actor.personId;

  if (scope === "team") return teamMatch || selfMatch;
  return selfMatch;
};
