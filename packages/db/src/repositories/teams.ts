import type { AssignmentPeriod } from "@ecclesia/domain/teams";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { assignments, type LocalizedText, people, positions, teams } from "../schema";

export type TeamOverview = {
  readonly id: string;
  readonly name: LocalizedText;
  readonly description: string | null;
  readonly color: string | null;
  readonly positions: readonly {
    readonly id: string;
    readonly name: LocalizedText;
    readonly isLeadership: boolean;
    readonly maxHolders: number | null;
    readonly holders: readonly { personId: string; firstName: string; lastName: string }[];
  }[];
};

export const listTeamsOverview = async (tx: Tx): Promise<TeamOverview[]> => {
  const [teamRows, positionRows, holderRows] = await Promise.all([
    tx.select().from(teams).orderBy(sql`${teams.name}->>'en'`),
    tx.select().from(positions).orderBy(asc(positions.isLeadership), sql`${positions.name}->>'en'`),
    tx
      .select({
        positionId: assignments.positionId,
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
      })
      .from(assignments)
      .innerJoin(people, eq(people.id, assignments.personId))
      .where(
        and(
          isNull(people.deletedAt),
          or(isNull(assignments.endsOn), sql`${assignments.endsOn} >= current_date`),
        ),
      ),
  ]);

  return teamRows.map((team) => ({
    id: team.id,
    name: team.name,
    description: team.description,
    color: team.color,
    positions: positionRows
      .filter((p) => p.teamId === team.id)
      .sort((a, b) => Number(b.isLeadership) - Number(a.isLeadership))
      .map((p) => ({
        id: p.id,
        name: p.name,
        isLeadership: p.isLeadership,
        maxHolders: p.maxHolders,
        holders: holderRows
          .filter((h) => h.positionId === p.id)
          .map(({ personId, firstName, lastName }) => ({ personId, firstName, lastName })),
      })),
  }));
};

export const insertTeam = async (
  tx: Tx,
  input: { name: LocalizedText; description: string | null; color: string | null },
) => {
  const [row] = await tx
    .insert(teams)
    .values({ ...input, churchId: currentChurchId })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const insertPosition = async (
  tx: Tx,
  input: { teamId: string; name: LocalizedText; isLeadership: boolean; maxHolders: number | null },
) => {
  const [row] = await tx
    .insert(positions)
    .values({ ...input, churchId: currentChurchId })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const getPosition = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(positions).where(eq(positions.id, id));
  return row ?? null;
};

export const listAssignmentPeriods = async (
  tx: Tx,
  positionId: string,
): Promise<AssignmentPeriod[]> =>
  tx
    .select({
      personId: assignments.personId,
      positionId: assignments.positionId,
      startsOn: assignments.startsOn,
      endsOn: assignments.endsOn,
    })
    .from(assignments)
    .where(eq(assignments.positionId, positionId));

export const insertAssignment = async (tx: Tx, input: AssignmentPeriod) => {
  const [row] = await tx
    .insert(assignments)
    .values({ ...input, churchId: currentChurchId })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const endAssignment = async (tx: Tx, personId: string, positionId: string, endsOn: Date) =>
  tx
    .update(assignments)
    .set({ endsOn })
    .where(
      and(
        eq(assignments.personId, personId),
        eq(assignments.positionId, positionId),
        isNull(assignments.endsOn),
      ),
    )
    .returning();

export const countPeopleServing = async (tx: Tx): Promise<number> => {
  const [row] = await tx
    .select({ total: sql<number>`count(distinct ${assignments.personId})::int` })
    .from(assignments)
    .innerJoin(people, eq(people.id, assignments.personId))
    .where(
      and(
        isNull(people.deletedAt),
        or(isNull(assignments.endsOn), sql`${assignments.endsOn} >= current_date`),
      ),
    );
  return row?.total ?? 0;
};
