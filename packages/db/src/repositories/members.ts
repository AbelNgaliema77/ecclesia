import { and, asc, eq, isNull } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { memberships, people, roles, user } from "../schema";

export type MemberRow = {
  readonly membershipId: string;
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly roleId: string;
  readonly roleName: { en: string; fr: string };
  readonly grants: (typeof roles.$inferSelect)["grants"];
  readonly personId: string | null;
  readonly personName: string | null;
  readonly joinedAt: Date;
};

export const listMembers = async (tx: Tx): Promise<MemberRow[]> => {
  const rows = await tx
    .select({
      membershipId: memberships.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      roleId: roles.id,
      roleName: roles.name,
      grants: roles.grants,
      personId: memberships.personId,
      personFirst: people.firstName,
      personLast: people.lastName,
      joinedAt: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .innerJoin(roles, eq(roles.id, memberships.roleId))
    .leftJoin(people, and(eq(people.id, memberships.personId), isNull(people.deletedAt)))
    .where(eq(memberships.churchId, currentChurchId))
    .orderBy(asc(user.name));

  return rows.map(({ personFirst, personLast, ...row }) => ({
    ...row,
    personName: personFirst && personLast ? `${personFirst} ${personLast}` : null,
  }));
};

export const findMember = async (tx: Tx, membershipId: string) => {
  const [row] = await tx
    .select()
    .from(memberships)
    .where(and(eq(memberships.id, membershipId), eq(memberships.churchId, currentChurchId)));
  return row ?? null;
};

export const isMember = async (tx: Tx, userId: string): Promise<boolean> => {
  const [row] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.churchId, currentChurchId)));
  return Boolean(row);
};

export const updateMember = async (
  tx: Tx,
  membershipId: string,
  changes: { roleId: string; personId: string | null },
) => {
  const [row] = await tx
    .update(memberships)
    .set(changes)
    .where(and(eq(memberships.id, membershipId), eq(memberships.churchId, currentChurchId)))
    .returning();
  return row ?? null;
};

export const removeMember = async (tx: Tx, membershipId: string) => {
  const [row] = await tx
    .delete(memberships)
    .where(and(eq(memberships.id, membershipId), eq(memberships.churchId, currentChurchId)))
    .returning();
  return row ?? null;
};

export const addMember = async (
  tx: Tx,
  input: { userId: string; roleId: string; personId: string | null },
) => {
  const [row] = await tx
    .insert(memberships)
    .values({ ...input, churchId: currentChurchId })
    .onConflictDoNothing()
    .returning();
  return row ?? null;
};
