import "server-only";
import type { people } from "@ecclesia/db/repositories";
import { type Actor, broadestScope, type Permission } from "@ecclesia/domain/access";

export const visibilityFor = (actor: Actor, permission: Permission): people.Visibility | null => {
  const scope = broadestScope(actor.grants, permission);
  switch (scope) {
    case "church":
      return { scope: "church" };
    case "team":
      return { scope: "team", teamIds: actor.ledTeamIds, personId: actor.personId };
    case "self":
      return { scope: "self", personId: actor.personId };
    case null:
      return null;
  }
};
