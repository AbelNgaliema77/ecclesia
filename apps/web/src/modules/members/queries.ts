import "server-only";
import { withChurch } from "@ecclesia/db";
import { invitations, members, people, platform, roles } from "@ecclesia/db/repositories";
import { invitationStatus } from "@ecclesia/domain/members";
import { db } from "@/server/db";
import { readChurch } from "@/server/queries";
import { hashInvitationToken, isWellFormedToken } from "./token";

export type InvitationView =
  | { readonly state: "notFound" }
  | {
      readonly state: "pending" | "accepted" | "revoked" | "expired";
      readonly churchName: string;
      readonly roleName: { en: string; fr: string };
      readonly email: string;
    };

export const loadInvitation = async (token: string): Promise<InvitationView> => {
  if (!isWellFormedToken(token)) return { state: "notFound" };
  const tokenHash = hashInvitationToken(token);
  const churchId = await invitations.churchForInvitationToken(db, tokenHash);
  if (!churchId) return { state: "notFound" };
  const church = await platform.getChurchSummary(db, churchId);
  const found = await withChurch(db, churchId, (tx) =>
    invitations.findInvitationByTokenHash(tx, tokenHash),
  );
  if (!church || !found) return { state: "notFound" };
  return {
    state: invitationStatus(found.invitation, new Date()),
    churchName: church.name,
    roleName: found.roleName,
    email: found.invitation.email,
  };
};

export const loadMembersPage = async () =>
  readChurch("users.manage", async ({ tx, actor, accessLevel }) => {
    const [memberRows, invitationRows, roleRows, peopleRows] = await Promise.all([
      members.listMembers(tx),
      invitations.listOpenInvitations(tx),
      roles.listRoles(tx),
      people.listPeopleOptions(tx),
    ]);
    return {
      members: memberRows,
      invitations: invitationRows,
      roles: roleRows.map((r) => ({ id: r.id, key: r.key, name: r.name })),
      people: peopleRows.map((p) => ({ id: p.id, name: `${p.lastName}, ${p.firstName}` })),
      currentUserId: actor.userId,
      readOnly: accessLevel !== "full",
    };
  });
