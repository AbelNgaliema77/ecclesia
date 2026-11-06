import type { Grant } from "@ecclesia/domain/access";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { type LocalizedText, memberships, roles } from "../schema";

export const listRoles = async (tx: Tx) =>
  tx
    .select({
      id: roles.id,
      key: roles.key,
      name: roles.name,
      grants: roles.grants,
      isSystem: roles.isSystem,
      members: sql<number>`count(${memberships.id})::int`,
    })
    .from(roles)
    .leftJoin(memberships, eq(memberships.roleId, roles.id))
    .groupBy(roles.id)
    .orderBy(desc(roles.isSystem), asc(sql`${roles.name}->>'en'`));

export const getRole = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(roles).where(eq(roles.id, id));
  return row ?? null;
};

export const createRole = async (tx: Tx, input: { name: LocalizedText; grants: Grant[] }) => {
  const [row] = await tx
    .insert(roles)
    .values({ ...input, churchId: currentChurchId, isSystem: false })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const updateRole = async (
  tx: Tx,
  id: string,
  input: { name: LocalizedText; grants: Grant[] },
) => {
  const [row] = await tx.update(roles).set(input).where(eq(roles.id, id)).returning();
  return row ?? null;
};

export const countRoleMembers = async (tx: Tx, id: string): Promise<number> => {
  const [row] = await tx
    .select({ total: count() })
    .from(memberships)
    .where(eq(memberships.roleId, id));
  return row?.total ?? 0;
};

export const deleteRole = async (tx: Tx, id: string) => {
  const [row] = await tx.delete(roles).where(eq(roles.id, id)).returning();
  return row ?? null;
};
