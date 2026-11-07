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
    ...scoped("team", "people.write", "teams.write"),
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
