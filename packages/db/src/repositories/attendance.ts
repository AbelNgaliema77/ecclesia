import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { attendanceCategories, headcounts, services, serviceTypes } from "../schema";

export const listAttendanceCategories = async (tx: Tx) =>
  tx
    .select()
    .from(attendanceCategories)
    .where(eq(attendanceCategories.isActive, true))
    .orderBy(asc(attendanceCategories.sortOrder));

export const listServiceTypes = async (tx: Tx) =>
  tx
    .select()
    .from(serviceTypes)
    .where(eq(serviceTypes.isActive, true))
    .orderBy(asc(serviceTypes.dayOfWeek), asc(serviceTypes.startsAt));

export const listRecentServices = async (tx: Tx, limit: number) =>
  tx
    .select({
      id: services.id,
      occursAt: services.occursAt,
      title: services.title,
      serviceTypeId: services.serviceTypeId,
      serviceTypeName: serviceTypes.name,
      total: sql<number>`coalesce(sum(${headcounts.count}), 0)::int`,
      categoriesCaptured: sql<number>`count(${headcounts.id})::int`,
    })
    .from(services)
    .innerJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
    .leftJoin(headcounts, eq(headcounts.serviceId, services.id))
    .groupBy(services.id, serviceTypes.id)
    .orderBy(desc(services.occursAt))
    .limit(limit);

export const getServiceWithHeadcounts = async (tx: Tx, id: string) => {
  const [service] = await tx
    .select({
      id: services.id,
      occursAt: services.occursAt,
      title: services.title,
      notes: services.notes,
      serviceTypeId: services.serviceTypeId,
      serviceTypeName: serviceTypes.name,
    })
    .from(services)
    .innerJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
    .where(eq(services.id, id));
  if (!service) return null;
  const counts = await tx
    .select({ categoryId: headcounts.categoryId, count: headcounts.count })
    .from(headcounts)
    .where(eq(headcounts.serviceId, id));
  return { ...service, counts };
};

export const findOrCreateService = async (
  tx: Tx,
  input: { serviceTypeId: string; occursAt: Date; title: string | null },
) => {
  const [created] = await tx
    .insert(services)
    .values({ ...input, churchId: currentChurchId })
    .onConflictDoNothing()
    .returning();
  if (created) return { service: created, created: true };
  const [existing] = await tx
    .select()
    .from(services)
    .where(
      and(eq(services.serviceTypeId, input.serviceTypeId), eq(services.occursAt, input.occursAt)),
    );
  if (!existing) throw new Error("Service lookup failed");
  return { service: existing, created: false };
};

export const saveHeadcounts = async (
  tx: Tx,
  serviceId: string,
  entries: readonly { categoryId: string; count: number }[],
  actorUserId: string | null,
) => {
  const before = await tx
    .select({ categoryId: headcounts.categoryId, count: headcounts.count })
    .from(headcounts)
    .where(eq(headcounts.serviceId, serviceId));

  await tx
    .insert(headcounts)
    .values(
      entries.map((entry) => ({
        churchId: currentChurchId,
        serviceId,
        categoryId: entry.categoryId,
        count: entry.count,
        capturedBy: actorUserId,
      })),
    )
    .onConflictDoUpdate({
      target: [headcounts.churchId, headcounts.serviceId, headcounts.categoryId],
      set: { count: sql`excluded.count`, capturedBy: sql`excluded.captured_by` },
    });

  return { before };
};

export const headcountRecordsSince = async (tx: Tx, since: Date) =>
  tx
    .select({
      serviceId: services.id,
      serviceTypeId: services.serviceTypeId,
      occurredAt: services.occursAt,
      categoryId: headcounts.categoryId,
      count: headcounts.count,
    })
    .from(headcounts)
    .innerJoin(services, eq(services.id, headcounts.serviceId))
    .where(gte(services.occursAt, since));
