import type { Grant } from "@ecclesia/domain/access";
import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import type { Tx } from "../client";
import { assignments, type LocalizedText, positions, roles } from "../schema";

export const loadRole = async (
  tx: Tx,
  roleId: string,
): Promise<{ grants: readonly Grant[]; name: LocalizedText } | null> => {
  const [role] = await tx
    .select({ grants: roles.grants, name: roles.name })
    .from(roles)
    .where(eq(roles.id, roleId));
  return role ?? null;
};

export const loadLedTeamIds = async (
  tx: Tx,
  personId: string | null,
  today: Date,
): Promise<string[]> => {
  if (personId === null) return [];
  const day = today.toISOString().slice(0, 10);
  const rows = await tx
    .selectDistinct({ teamId: positions.teamId })
    .from(assignments)
    .innerJoin(positions, eq(positions.id, assignments.positionId))
    .where(
      and(
        eq(assignments.personId, personId),
        eq(positions.isLeadership, true),
        lte(assignments.startsOn, sql`${day}::date`),
        or(isNull(assignments.endsOn), gte(assignments.endsOn, sql`${day}::date`)),
      ),
    );
  return rows.map((r) => r.teamId);
};
