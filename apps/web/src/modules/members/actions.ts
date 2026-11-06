"use server";

import { withChurch } from "@ecclesia/db";
import { audit, invitations, members, roles } from "@ecclesia/db/repositories";
import { guardLastAdmin, managesUsers } from "@ecclesia/domain/access";
import {
  emailsMatch,
  invitationExpiry,
  invitationInputSchema,
  invitationStatus,
} from "@ecclesia/domain/members";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, formToObject, parseInput, runChurchAction, unwrap } from "@/server/action";
import { ACTIVE_CHURCH_COOKIE, requireSession } from "@/server/context";
import { db } from "@/server/db";
import { env } from "@/server/env";
import { hashInvitationToken, isWellFormedToken, newInvitationToken } from "./token";

export type CreatedInvitation = { link: string; email: string; expiresAt: string };

const uniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "cause" in error &&
  typeof error.cause === "object" &&
  error.cause !== null &&
  "code" in error.cause &&
  error.cause.code === "23505";

export async function createInvitationAction(
  _previous: ActionState<CreatedInvitation>,
  formData: FormData,
): Promise<ActionState<CreatedInvitation>> {
  const result = await runChurchAction(
    { permission: "users.manage", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(invitationInputSchema, formToObject(formData));
      ensure((await roles.getRole(tx, input.roleId)) !== null, "notFound");
      const existing = await members.listMembers(tx);
      ensure(!existing.some((m) => emailsMatch(m.email, input.email)), "members.alreadyMember");
      ensure(
        (await invitations.findOpenInvitationByEmail(tx, input.email)) === null,
        "members.alreadyInvited",
      );

      const { token, tokenHash } = newInvitationToken();
      const expiresAt = invitationExpiry(new Date());
      try {
        const created = await invitations.createInvitation(tx, {
          ...input,
          tokenHash,
          invitedBy: actor.userId,
          expiresAt,
        });
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "invitation.created",
          entityType: "invitation",
          entityId: created.id,
          after: { email: created.email, roleId: created.roleId, personId: created.personId },
        });
      } catch (error) {
        ensure(!uniqueViolation(error), "members.alreadyInvited");
        throw error;
      }
      return {
        link: `${env.BETTER_AUTH_URL}/invite/${token}`,
        email: input.email,
        expiresAt: expiresAt.toISOString(),
      };
    },
  );
  if (result.status === "success") revalidatePath("/settings/members");
  return result;
}

const idSchema = z.object({ id: z.uuid() });

export async function revokeInvitationAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "users.manage", write: true },
    async ({ tx, actor }) => {
      const { id } = parseInput(idSchema, formToObject(formData));
      const revoked = await invitations.revokeInvitation(tx, id);
      ensure(revoked !== null, "notFound");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "invitation.revoked",
        entityType: "invitation",
        entityId: id,
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/members");
  return result;
}

const memberUpdateSchema = z.object({
  id: z.uuid(),
  roleId: z.uuid(),
  personId: z
    .union([z.literal(""), z.uuid()])
    .optional()
    .transform((value) => value || null),
});

export async function updateMemberAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "users.manage", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(memberUpdateSchema, formToObject(formData));
      const current = await members.findMember(tx, input.id);
      ensure(current !== null, "notFound");
      if (!current) return null;
      ensure(
        current.userId !== actor.userId || current.roleId === input.roleId,
        "members.selfRole",
      );
      const role = await roles.getRole(tx, input.roleId);
      ensure(role !== null, "notFound");
      if (!role) return null;

      const all = await members.listMembers(tx);
      unwrap(
        guardLastAdmin(
          all.map((m) => ({ membershipId: m.membershipId, managesUsers: managesUsers(m.grants) })),
          { kind: "changeRole", membershipId: input.id, managesUsers: managesUsers(role.grants) },
        ),
      );

      const updated = await members.updateMember(tx, input.id, {
        roleId: input.roleId,
        personId: input.personId,
      });
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "member.updated",
        entityType: "membership",
        entityId: input.id,
        before: { roleId: current.roleId, personId: current.personId },
        after: { roleId: updated?.roleId, personId: updated?.personId },
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/members");
  return result;
}

export async function removeMemberAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "users.manage", write: true },
    async ({ tx, actor }) => {
      const { id } = parseInput(idSchema, formToObject(formData));
      const current = await members.findMember(tx, id);
      ensure(current !== null, "notFound");
      ensure(current?.userId !== actor.userId, "members.selfRole");
      const all = await members.listMembers(tx);
      unwrap(
        guardLastAdmin(
          all.map((m) => ({ membershipId: m.membershipId, managesUsers: managesUsers(m.grants) })),
          { kind: "remove", membershipId: id },
        ),
      );
      await members.removeMember(tx, id);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "member.removed",
        entityType: "membership",
        entityId: id,
        before: current,
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/members");
  return result;
}

export async function acceptInvitationAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const session = await requireSession();
  const token = String(formData.get("token") ?? "");
  if (!isWellFormedToken(token)) return { status: "error", code: "notFound" };
  const tokenHash = hashInvitationToken(token);
  const churchId = await invitations.churchForInvitationToken(db, tokenHash);
  if (!churchId) return { status: "error", code: "notFound" };

  const outcome = await withChurch(db, churchId, async (tx) => {
    const found = await invitations.findInvitationByTokenHash(tx, tokenHash);
    if (!found) return "notFound" as const;
    const { invitation } = found;
    if (invitationStatus(invitation, new Date()) !== "pending") return "notFound" as const;
    if (!emailsMatch(invitation.email, session.user.email)) return "forbidden" as const;
    if (!(await members.isMember(tx, session.user.id))) {
      await members.addMember(tx, {
        userId: session.user.id,
        roleId: invitation.roleId,
        personId: invitation.personId,
      });
    }
    await invitations.markInvitationAccepted(tx, invitation.id, session.user.id);
    await audit.recordAudit(tx, {
      actorUserId: session.user.id,
      action: "invitation.accepted",
      entityType: "invitation",
      entityId: invitation.id,
    });
    return "accepted" as const;
  });

  if (outcome !== "accepted") return { status: "error", code: outcome };
  (await cookies()).set(ACTIVE_CHURCH_COOKIE, churchId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}
