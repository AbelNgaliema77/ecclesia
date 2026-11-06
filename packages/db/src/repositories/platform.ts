import { eq } from "drizzle-orm";
import type { Database } from "../client";
import { churches, memberships, subscriptions, user } from "../schema";

export type ChurchMembership = {
  readonly membershipId: string;
  readonly churchId: string;
  readonly churchName: string;
  readonly churchSlug: string;
  readonly defaultLocale: "en" | "fr";
  readonly currency: string;
  readonly timezone: string;
  readonly isDemo: boolean;
  readonly roleId: string;
  readonly personId: string | null;
  readonly features: typeof churches.$inferSelect.features;
  readonly subscription: {
    readonly status: typeof subscriptions.$inferSelect.status;
    readonly plan: typeof subscriptions.$inferSelect.plan;
    readonly trialEndsAt: Date | null;
    readonly pastDueSince: Date | null;
    readonly cancelledAt: Date | null;
  } | null;
};

export const listMembershipsForUser = async (
  db: Database,
  userId: string,
): Promise<ChurchMembership[]> => {
  const rows = await db
    .select({
      membershipId: memberships.id,
      churchId: churches.id,
      churchName: churches.name,
      churchSlug: churches.slug,
      defaultLocale: churches.defaultLocale,
      currency: churches.currency,
      timezone: churches.timezone,
      isDemo: churches.isDemo,
      features: churches.features,
      roleId: memberships.roleId,
      personId: memberships.personId,
      status: subscriptions.status,
      plan: subscriptions.plan,
      trialEndsAt: subscriptions.trialEndsAt,
      pastDueSince: subscriptions.pastDueSince,
      cancelledAt: subscriptions.cancelledAt,
    })
    .from(memberships)
    .innerJoin(churches, eq(churches.id, memberships.churchId))
    .leftJoin(subscriptions, eq(subscriptions.churchId, churches.id))
    .where(eq(memberships.userId, userId))
    .orderBy(churches.name);

  return rows.map(({ status, plan, trialEndsAt, pastDueSince, cancelledAt, ...rest }) => ({
    ...rest,
    subscription: status && plan ? { status, plan, trialEndsAt, pastDueSince, cancelledAt } : null,
  }));
};

export const setUserLocale = async (db: Database, userId: string, locale: "en" | "fr") => {
  await db.update(user).set({ locale }).where(eq(user.id, userId));
};
