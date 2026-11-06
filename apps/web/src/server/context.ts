import "server-only";
import { withChurch } from "@ecclesia/db";
import { access, platform } from "@ecclesia/db/repositories";
import type { Actor } from "@ecclesia/domain/access";
import { type AccessLevel, accessLevel } from "@ecclesia/domain/billing";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";
import { db } from "./db";

export const ACTIVE_CHURCH_COOKIE = "ecclesia_church";

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const requireSession = async () => {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
};

export type ChurchContext = {
  readonly user: { readonly id: string; readonly name: string; readonly email: string };
  readonly membership: platform.ChurchMembership;
  readonly memberships: readonly platform.ChurchMembership[];
  readonly roleName: { readonly en: string; readonly fr: string };
  readonly actor: Actor;
  readonly accessLevel: AccessLevel;
};

export const getChurchContext = cache(async (): Promise<ChurchContext> => {
  const session = await requireSession();
  const memberships = await platform.listMembershipsForUser(db, session.user.id);
  const preferred = (await cookies()).get(ACTIVE_CHURCH_COOKIE)?.value;
  const membership = memberships.find((m) => m.churchId === preferred) ?? memberships[0];
  if (!membership) redirect("/onboarding");

  const { role, ledTeamIds } = await withChurch(db, membership.churchId, async (tx) => ({
    role: await access.loadRole(tx, membership.roleId),
    ledTeamIds: await access.loadLedTeamIds(tx, membership.personId, new Date()),
  }));

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    membership,
    memberships,
    roleName: role?.name ?? { en: "Member", fr: "Membre" },
    actor: {
      userId: session.user.id,
      personId: membership.personId,
      ledTeamIds,
      grants: role?.grants ?? [],
    },
    accessLevel: membership.subscription
      ? accessLevel(membership.subscription, new Date())
      : "full",
  };
});
