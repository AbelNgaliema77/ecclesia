import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { currentChurchId, type Database, type Tx } from "../client";
import { invitations, roles } from "../schema";

export const churchForInvitationToken = async (
  db: Database,
  tokenHash: string,
): Promise<string | null> => {
  const rows = await db.execute<{ church_id: string | null }>(
    sql`select app_invitation_church(${tokenHash}) as church_id`,
  );
  return rows[0]?.church_id ?? null;
};

export const createInvitation = async (
  tx: Tx,
  input: {
    email: string;
    roleId: string;
    personId: string | null;
    tokenHash: string;
    invitedBy: string;
    expiresAt: Date;
  },
) => {
  const [row] = await tx
    .insert(invitations)
    .values({ ...input, churchId: currentChurchId })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const listOpenInvitations = async (tx: Tx) =>
  tx
    .select({
      id: invitations.id,
      email: invitations.email,
      roleName: roles.name,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .innerJoin(roles, eq(roles.id, invitations.roleId))
    .where(and(isNull(invitations.acceptedAt), isNull(invitations.revokedAt)))
    .orderBy(desc(invitations.createdAt));

export const findOpenInvitationByEmail = async (tx: Tx, email: string) => {
  const [row] = await tx
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.email, email),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    );
  return row ?? null;
};

export const findInvitationByTokenHash = async (tx: Tx, tokenHash: string) => {
  const [row] = await tx
    .select({
      invitation: invitations,
      roleName: roles.name,
    })
    .from(invitations)
    .innerJoin(roles, eq(roles.id, invitations.roleId))
    .where(eq(invitations.tokenHash, tokenHash));
  return row ?? null;
};

export const revokeInvitation = async (tx: Tx, id: string) => {
  const [row] = await tx
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(invitations.id, id), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)),
    )
    .returning();
  return row ?? null;
};

export const markInvitationAccepted = async (tx: Tx, id: string, userId: string) => {
  const [row] = await tx
    .update(invitations)
    .set({ acceptedAt: new Date(), acceptedBy: userId })
    .where(
      and(eq(invitations.id, id), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)),
    )
    .returning();
  return row ?? null;
};
