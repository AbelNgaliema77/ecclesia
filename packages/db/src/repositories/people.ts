import type { PeopleFilter, ValidPerson } from "@ecclesia/domain/people";
import { and, asc, count, eq, gte, ilike, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { assignments, type LocalizedText, memberships, people, positions, teams } from "../schema";

export type Visibility =
  | { readonly scope: "church" }
  | {
      readonly scope: "team";
      readonly teamIds: readonly string[];
      readonly personId: string | null;
    }
  | { readonly scope: "self"; readonly personId: string | null };

const visibilityFilter = (visibility: Visibility): SQL | undefined => {
  if (visibility.scope === "church") return undefined;
  const self = visibility.personId ? eq(people.id, visibility.personId) : sql`false`;
  if (visibility.scope === "self") return self;
  if (visibility.teamIds.length === 0) return self;
  const inLedTeams = inArray(
    people.id,
    sql`(select ${assignments.personId} from ${assignments}
         inner join ${positions} on ${positions.id} = ${assignments.positionId}
         where ${inArray(positions.teamId, [...visibility.teamIds])}
         and (${assignments.endsOn} is null or ${assignments.endsOn} >= current_date))`,
  );
  return or(self, inLedTeams);
};

export type PersonRow = typeof people.$inferSelect;

export type ListPeopleQuery = {
  readonly search?: string;
  readonly filter?: PeopleFilter;
  readonly limit: number;
  readonly offset: number;
};

const servingIds = (leadersOnly: boolean): SQL =>
  sql`(select ${assignments.personId} from ${assignments}
       inner join ${positions} on ${positions.id} = ${assignments.positionId}
       where (${assignments.endsOn} is null or ${assignments.endsOn} >= current_date)
       ${leadersOnly ? sql`and ${positions.isLeadership} = true` : sql``})`;

const filterClause = (filter: PeopleFilter | undefined): SQL | undefined => {
  if (filter === "serving") return inArray(people.id, servingIds(false));
  if (filter === "leaders") return inArray(people.id, servingIds(true));
  if (filter === "unassigned") return sql`${people.id} not in ${servingIds(false)}`;
  return undefined;
};

export const listPeople = async (tx: Tx, visibility: Visibility, query: ListPeopleQuery) => {
  const term = query.search?.trim();
  const where = and(
    isNull(people.deletedAt),
    visibilityFilter(visibility),
    filterClause(query.filter),
    term
      ? or(
          ilike(people.firstName, `%${term}%`),
          ilike(people.lastName, `%${term}%`),
          ilike(people.email, `%${term}%`),
          ilike(people.phone, `%${term}%`),
        )
      : undefined,
  );

  const [rows, totals] = await Promise.all([
    tx
      .select()
      .from(people)
      .where(where)
      .orderBy(asc(people.lastName), asc(people.firstName))
      .limit(query.limit)
      .offset(query.offset),
    tx.select({ total: count() }).from(people).where(where),
  ]);

  const serving = await servingFor(
    tx,
    rows.map((r) => r.id),
  );
  return {
    rows: rows.map((row) => ({ ...row, serving: serving.get(row.id) ?? [] })),
    total: totals[0]?.total ?? 0,
  };
};

export type Serving = {
  readonly teamId: string;
  readonly teamName: LocalizedText;
  readonly isLeader: boolean;
};

export const servingFor = async (
  tx: Tx,
  personIds: readonly string[],
): Promise<Map<string, Serving[]>> => {
  const result = new Map<string, Serving[]>();
  if (personIds.length === 0) return result;
  const rows = await tx
    .select({
      personId: assignments.personId,
      teamId: teams.id,
      teamName: teams.name,
      isLeader: positions.isLeadership,
    })
    .from(assignments)
    .innerJoin(positions, eq(positions.id, assignments.positionId))
    .innerJoin(teams, eq(teams.id, positions.teamId))
    .where(
      and(
        inArray(assignments.personId, [...personIds]),
        or(isNull(assignments.endsOn), gte(assignments.endsOn, sql`current_date`)),
      ),
    );
  for (const row of rows) {
    const list = result.get(row.personId) ?? [];
    const existing = list.find((s) => s.teamId === row.teamId);
    if (existing) {
      if (row.isLeader && !existing.isLeader)
        list[list.indexOf(existing)] = { ...existing, isLeader: true };
    } else {
      list.push({ teamId: row.teamId, teamName: row.teamName, isLeader: row.isLeader });
    }
    result.set(row.personId, list);
  }
  return result;
};

export const softDeletePerson = async (tx: Tx, id: string) => {
  const [row] = await tx
    .update(people)
    .set({ deletedAt: new Date() })
    .where(and(eq(people.id, id), isNull(people.deletedAt)))
    .returning();
  if (!row) return null;
  await tx
    .delete(assignments)
    .where(and(eq(assignments.personId, id), gte(assignments.startsOn, sql`current_date`)));
  await tx
    .update(assignments)
    .set({ endsOn: sql`current_date - 1` })
    .where(
      and(
        eq(assignments.personId, id),
        or(isNull(assignments.endsOn), gte(assignments.endsOn, sql`current_date`)),
      ),
    );
  await tx
    .update(memberships)
    .set({ personId: null })
    .where(and(eq(memberships.personId, id), eq(memberships.churchId, currentChurchId)));
  return row;
};

export const getPerson = async (tx: Tx, id: string): Promise<PersonRow | null> => {
  const [row] = await tx
    .select()
    .from(people)
    .where(and(eq(people.id, id), isNull(people.deletedAt)));
  return row ?? null;
};

export const insertPerson = async (tx: Tx, input: ValidPerson): Promise<PersonRow> => {
  const [row] = await tx
    .insert(people)
    .values({ ...input, churchId: currentChurchId })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const updatePerson = async (tx: Tx, id: string, input: ValidPerson): Promise<PersonRow> => {
  const [row] = await tx.update(people).set(input).where(eq(people.id, id)).returning();
  if (!row) throw new Error("Update failed");
  return row;
};

export const countPeople = async (tx: Tx): Promise<number> => {
  const [row] = await tx.select({ total: count() }).from(people).where(isNull(people.deletedAt));
  return row?.total ?? 0;
};

export const countJoinedIn = async (tx: Tx, year: number): Promise<number> => {
  const [row] = await tx
    .select({ total: count() })
    .from(people)
    .where(and(isNull(people.deletedAt), eq(people.joinedYear, year)));
  return row?.total ?? 0;
};

export const personTeamIds = async (tx: Tx, personId: string): Promise<string[]> => {
  const rows = await tx
    .selectDistinct({ teamId: positions.teamId })
    .from(assignments)
    .innerJoin(positions, eq(positions.id, assignments.positionId))
    .where(
      and(
        eq(assignments.personId, personId),
        or(isNull(assignments.endsOn), gte(assignments.endsOn, sql`current_date`)),
      ),
    );
  return rows.map((r) => r.teamId);
};

export const listPeopleOptions = async (tx: Tx) =>
  tx
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
    })
    .from(people)
    .where(isNull(people.deletedAt))
    .orderBy(asc(people.lastName), asc(people.firstName));

export const identityRecords = (tx: Tx) =>
  tx
    .select({
      firstName: people.firstName,
      lastName: people.lastName,
      email: people.email,
      phone: people.phone,
    })
    .from(people)
    .where(isNull(people.deletedAt));

export const insertPeople = async (
  tx: Tx,
  inputs: readonly ValidPerson[],
): Promise<{ id: string }[]> => {
  if (inputs.length === 0) return [];
  return tx
    .insert(people)
    .values(inputs.map((input) => ({ ...input, churchId: currentChurchId })))
    .returning({ id: people.id });
};

export const existingIds = async (tx: Tx, ids: readonly string[]): Promise<Set<string>> => {
  if (ids.length === 0) return new Set();
  const rows = await tx
    .select({ id: people.id })
    .from(people)
    .where(and(inArray(people.id, [...ids]), isNull(people.deletedAt)));
  return new Set(rows.map((r) => r.id));
};

export const displayNames = async (
  tx: Tx,
  ids: readonly string[],
): Promise<Map<string, string>> => {
  if (ids.length === 0) return new Map();
  const rows = await tx
    .select({
      id: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
    })
    .from(people)
    .where(inArray(people.id, [...ids]));
  return new Map(rows.map((r) => [r.id, `${r.firstName} ${r.lastName}`]));
};
