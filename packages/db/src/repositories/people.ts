import type { PersonStatus, ValidPerson } from "@ecclesia/domain/people";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { assignments, people, personStatusHistory, positions } from "../schema";

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
  readonly status?: PersonStatus;
  readonly limit: number;
  readonly offset: number;
};

export const listPeople = async (tx: Tx, visibility: Visibility, query: ListPeopleQuery) => {
  const term = query.search?.trim();
  const where = and(
    isNull(people.deletedAt),
    visibilityFilter(visibility),
    query.status ? eq(people.status, query.status) : undefined,
    term
      ? or(
          ilike(people.firstName, `%${term}%`),
          ilike(people.lastName, `%${term}%`),
          ilike(people.preferredName, `%${term}%`),
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

  return { rows, total: totals[0]?.total ?? 0 };
};

export const getPerson = async (tx: Tx, id: string): Promise<PersonRow | null> => {
  const [row] = await tx
    .select()
    .from(people)
    .where(and(eq(people.id, id), isNull(people.deletedAt)));
  return row ?? null;
};

export const insertPerson = async (
  tx: Tx,
  input: ValidPerson,
  actorUserId: string | null,
): Promise<PersonRow> => {
  const [row] = await tx
    .insert(people)
    .values({ ...input, churchId: currentChurchId })
    .returning();
  if (!row) throw new Error("Insert failed");
  await tx.insert(personStatusHistory).values({
    churchId: currentChurchId,
    personId: row.id,
    fromStatus: null,
    toStatus: row.status,
    changedBy: actorUserId,
  });
  return row;
};

export const updatePerson = async (
  tx: Tx,
  id: string,
  input: ValidPerson,
  previousStatus: PersonStatus,
  actorUserId: string | null,
): Promise<PersonRow> => {
  const [row] = await tx.update(people).set(input).where(eq(people.id, id)).returning();
  if (!row) throw new Error("Update failed");
  if (row.status !== previousStatus) {
    await tx.insert(personStatusHistory).values({
      churchId: currentChurchId,
      personId: id,
      fromStatus: previousStatus,
      toStatus: row.status,
      changedBy: actorUserId,
    });
  }
  return row;
};

export const countPeopleByStatus = async (tx: Tx) =>
  tx
    .select({ status: people.status, total: count() })
    .from(people)
    .where(isNull(people.deletedAt))
    .groupBy(people.status);

export const countFirstVisitsSince = async (tx: Tx, since: Date): Promise<number> => {
  const [row] = await tx
    .select({ total: count() })
    .from(people)
    .where(
      and(
        isNull(people.deletedAt),
        gte(people.firstVisitOn, sql`${since.toISOString().slice(0, 10)}::date`),
      ),
    );
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

export const statusHistory = async (tx: Tx, personId: string) =>
  tx
    .select({
      fromStatus: personStatusHistory.fromStatus,
      toStatus: personStatusHistory.toStatus,
      changedAt: personStatusHistory.changedAt,
    })
    .from(personStatusHistory)
    .where(eq(personStatusHistory.personId, personId))
    .orderBy(desc(personStatusHistory.changedAt));
