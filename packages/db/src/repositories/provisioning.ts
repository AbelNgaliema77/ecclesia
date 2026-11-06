import { DEFAULT_ROLE_KEYS, DEFAULT_ROLES, type DefaultRoleKey } from "@ecclesia/domain/access";
import { currentChurchId, type Database, withChurch } from "../client";
import {
  attendanceCategories,
  campuses,
  churches,
  type LocalizedText,
  memberships,
  roles,
  serviceTypes,
  subscriptions,
} from "../schema";

const ROLE_NAMES: Record<DefaultRoleKey, LocalizedText> = {
  churchAdmin: { en: "Church Admin", fr: "Administrateur" },
  seniorPastor: { en: "Senior Pastor", fr: "Pasteur principal" },
  financeOfficer: { en: "Finance Officer", fr: "Responsable financier" },
  treasurer: { en: "Treasurer", fr: "Trésorier" },
  teamLeader: { en: "Team Leader", fr: "Chef d'équipe" },
  usher: { en: "Usher", fr: "Protocole" },
  inventoryManager: { en: "Inventory Manager", fr: "Gestionnaire d'inventaire" },
  member: { en: "Member", fr: "Membre" },
  auditor: { en: "Auditor", fr: "Auditeur" },
};

const DEFAULT_CATEGORIES: { name: LocalizedText; color: string }[] = [
  { name: { en: "Men", fr: "Hommes" }, color: "#3987e5" },
  { name: { en: "Women", fr: "Femmes" }, color: "#d95926" },
  { name: { en: "Youth", fr: "Jeunesse" }, color: "#199e70" },
  { name: { en: "Sunday School", fr: "École du dimanche" }, color: "#c98500" },
  { name: { en: "Visitors", fr: "Visiteurs" }, color: "#d55181" },
];

const DEFAULT_SERVICE_TYPES: { name: LocalizedText; dayOfWeek: number; startsAt: string }[] = [
  { name: { en: "First Service", fr: "Premier culte" }, dayOfWeek: 0, startsAt: "08:30" },
  { name: { en: "Second Service", fr: "Deuxième culte" }, dayOfWeek: 0, startsAt: "11:00" },
  { name: { en: "Midweek Service", fr: "Culte de semaine" }, dayOfWeek: 3, startsAt: "18:30" },
];

export type ProvisionChurchInput = {
  readonly name: string;
  readonly slug: string;
  readonly defaultLocale: "en" | "fr";
  readonly ownerUserId: string;
  readonly isDemo?: boolean;
  readonly trialDays?: number;
};

export const provisionChurch = async (db: Database, input: ProvisionChurchInput) => {
  const [church] = await db
    .insert(churches)
    .values({
      name: input.name,
      slug: input.slug,
      defaultLocale: input.defaultLocale,
      isDemo: input.isDemo ?? false,
    })
    .returning();
  if (!church) throw new Error("Church creation failed");

  const trialEndsAt = new Date(Date.now() + (input.trialDays ?? 30) * 86_400_000);
  await db.insert(subscriptions).values({
    churchId: church.id,
    status: input.isDemo ? "comped" : "trialing",
    trialEndsAt: input.isDemo ? null : trialEndsAt,
  });

  const result = await withChurch(db, church.id, async (tx) => {
    const roleRows = await tx
      .insert(roles)
      .values(
        DEFAULT_ROLE_KEYS.map((key) => ({
          churchId: currentChurchId,
          key,
          name: ROLE_NAMES[key],
          grants: [...DEFAULT_ROLES[key]],
          isSystem: true,
        })),
      )
      .returning({ id: roles.id, key: roles.key });

    const [campus] = await tx
      .insert(campuses)
      .values({ churchId: currentChurchId, name: input.name, isPrimary: true })
      .returning();

    const categoryRows = await tx
      .insert(attendanceCategories)
      .values(
        DEFAULT_CATEGORIES.map((c, index) => ({
          churchId: currentChurchId,
          name: c.name,
          color: c.color,
          sortOrder: index,
        })),
      )
      .returning();

    const serviceTypeRows = await tx
      .insert(serviceTypes)
      .values(
        DEFAULT_SERVICE_TYPES.map((s) => ({
          churchId: currentChurchId,
          campusId: campus?.id ?? null,
          name: s.name,
          dayOfWeek: s.dayOfWeek,
          startsAt: s.startsAt,
        })),
      )
      .returning();

    const adminRole = roleRows.find((r) => r.key === "churchAdmin");
    if (!adminRole) throw new Error("Admin role missing");

    await tx.insert(memberships).values({
      churchId: currentChurchId,
      userId: input.ownerUserId,
      roleId: adminRole.id,
    });

    return { roles: roleRows, categories: categoryRows, serviceTypes: serviceTypeRows };
  });

  return { church, ...result };
};
