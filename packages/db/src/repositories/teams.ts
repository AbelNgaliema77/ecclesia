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

export const getTeam = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(teams).where(eq(teams.id, id));
  return row ?? null;
};

export type TeamDetail = Omit<TeamOverview, "positions"> & {
  readonly positions: readonly (TeamOverview["positions"][number] & {
    readonly assignments: readonly {
      readonly assignmentId: string;
      readonly personId: string;
      readonly firstName: string;
      readonly lastName: string;
      readonly startsOn: Date;
    }[];
    readonly historyCount: number;
  })[];
};

export const getTeamDetail = async (tx: Tx, id: string): Promise<TeamDetail | null> => {
  const team = await getTeam(tx, id);
  if (!team) return null;
  const [positionRows, assignmentRows] = await Promise.all([
    tx
      .select()
      .from(positions)
      .where(eq(positions.teamId, id))
      .orderBy(sql`${positions.isLeadership} desc`, sql`${positions.name}->>'en'`),
    tx
      .select({
        assignmentId: assignments.id,
        positionId: assignments.positionId,
        personId: people.id,
        firstName: people.firstName,
        lastName: people.lastName,
        startsOn: assignments.startsOn,
        endsOn: assignments.endsOn,
      })
      .from(assignments)
      .innerJoin(positions, eq(positions.id, assignments.positionId))
      .innerJoin(people, eq(people.id, assignments.personId))
      .where(and(eq(positions.teamId, id), isNull(people.deletedAt)))
      .orderBy(asc(people.lastName)),
  ]);

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    color: team.color,
    positions: positionRows.map((p) => {
      const forPosition = assignmentRows.filter((a) => a.positionId === p.id);
      const active = forPosition.filter((a) => a.endsOn === null || a.endsOn.getTime() >= today);
      return {
        id: p.id,
        name: p.name,
        isLeadership: p.isLeadership,
        maxHolders: p.maxHolders,
        holders: active.map(({ personId, firstName, lastName }) => ({
          personId,
          firstName,
          lastName,
        })),
        assignments: active.map(({ assignmentId, personId, firstName, lastName, startsOn }) => ({
          assignmentId,
          personId,
          firstName,
          lastName,
          startsOn,
        })),
        historyCount: forPosition.length,
      };
    }),
  };
};

type TeamValues = { name: LocalizedText; description: string | null; color: string | null };

export const updateTeam = async (tx: Tx, id: string, input: TeamValues) => {
  const [row] = await tx.update(teams).set(input).where(eq(teams.id, id)).returning();
  return row ?? null;
};

export const countTeamAssignments = async (tx: Tx, teamId: string): Promise<number> => {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(assignments)
    .innerJoin(positions, eq(positions.id, assignments.positionId))
    .where(eq(positions.teamId, teamId));
  return row?.total ?? 0;
};

export const deleteTeam = async (tx: Tx, id: string) => {
  const [row] = await tx.delete(teams).where(eq(teams.id, id)).returning();
  return row ?? null;
};

type PositionValues = { name: LocalizedText; isLeadership: boolean; maxHolders: number | null };

export const updatePosition = async (tx: Tx, id: string, input: PositionValues) => {
  const [row] = await tx.update(positions).set(input).where(eq(positions.id, id)).returning();
  return row ?? null;
};

export const countPositionAssignments = async (tx: Tx, positionId: string): Promise<number> => {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(assignments)
    .where(eq(assignments.positionId, positionId));
  return row?.total ?? 0;
};

export const deletePosition = async (tx: Tx, id: string) => {
  const [row] = await tx.delete(positions).where(eq(positions.id, id)).returning();
  return row ?? null;
};

export const getAssignmentWithTeam = async (tx: Tx, id: string) => {
  const [row] = await tx
    .select({
      id: assignments.id,
      personId: assignments.personId,
      positionId: assignments.positionId,
      startsOn: assignments.startsOn,
      endsOn: assignments.endsOn,
      teamId: positions.teamId,
    })
    .from(assignments)
    .innerJoin(positions, eq(positions.id, assignments.positionId))
    .where(eq(assignments.id, id));
  return row ?? null;
};

export const setAssignmentEnd = async (tx: Tx, id: string, endsOn: Date) => {
  const [row] = await tx
    .update(assignments)
    .set({ endsOn })
    .where(eq(assignments.id, id))
    .returning();
  return row ?? null;
};

export const deleteAssignment = async (tx: Tx, id: string) => {
  const [row] = await tx.delete(assignments).where(eq(assignments.id, id)).returning();
  return row ?? null;
};

export type PersonAssignment = {
  readonly assignmentId: string;
  readonly teamId: string;
  readonly teamName: LocalizedText;
  readonly positionName: LocalizedText;
  readonly isLeadership: boolean;
  readonly startsOn: Date;
};

export const activeAssignmentsFor = async (tx: Tx, personId: string): Promise<PersonAssignment[]> =>
  tx
    .select({
      assignmentId: assignments.id,
      teamId: teams.id,
      teamName: teams.name,
      positionName: positions.name,
      isLeadership: positions.isLeadership,
      startsOn: assignments.startsOn,
    })
    .from(assignments)
    .innerJoin(positions, eq(positions.id, assignments.positionId))
    .innerJoin(teams, eq(teams.id, positions.teamId))
    .where(
      and(
        eq(assignments.personId, personId),
        or(isNull(assignments.endsOn), sql`${assignments.endsOn} >= current_date`),
      ),
    )
    .orderBy(sql`${teams.name}->>'en'`);

export type ImportTarget = {
  readonly teamId: string;
  readonly name: LocalizedText;
  readonly positionId: string | null;
  readonly openSpots: number | null;
};

export const listImportTargets = async (tx: Tx): Promise<ImportTarget[]> => {
  const overview = await listTeamsOverview(tx);
  return overview.map((team) => {
    const position = team.positions.find(
      (p) => !p.isLeadership && (p.maxHolders === null || p.holders.length < p.maxHolders),
    );
    return {
      teamId: team.id,
      name: team.name,
      positionId: position?.id ?? null,
      openSpots:
        position && position.maxHolders !== null
          ? position.maxHolders - position.holders.length
          : null,
    };
  });
};
