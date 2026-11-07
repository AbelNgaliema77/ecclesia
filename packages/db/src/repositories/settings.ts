import type { BrandTheme, LogoType } from "@ecclesia/domain/settings";
import { asc, desc, eq, max, sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import {
  attendanceCategories,
  churches,
  churchLogos,
  type LocalizedText,
  serviceTypes,
} from "../schema";

export const getChurch = async (tx: Tx) => {
  const [row] = await tx.select().from(churches).where(eq(churches.id, currentChurchId));
  return row ?? null;
};

export const updateChurch = async (
  tx: Tx,
  input: { name: string; defaultLocale: "en" | "fr"; timezone: string; currency: string },
) => {
  const [row] = await tx
    .update(churches)
    .set(input)
    .where(eq(churches.id, currentChurchId))
    .returning();
  return row ?? null;
};

export const listAllServiceTypes = async (tx: Tx) =>
  tx
    .select()
    .from(serviceTypes)
    .orderBy(desc(serviceTypes.isActive), asc(serviceTypes.dayOfWeek), asc(serviceTypes.startsAt));

export const getServiceType = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(serviceTypes).where(eq(serviceTypes.id, id));
  return row ?? null;
};

type ServiceTypeValues = { name: LocalizedText; dayOfWeek: number | null; startsAt: string | null };

export const createServiceType = async (tx: Tx, input: ServiceTypeValues) => {
  const [row] = await tx
    .insert(serviceTypes)
    .values({ ...input, churchId: currentChurchId })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const updateServiceType = async (
  tx: Tx,
  id: string,
  input: Partial<ServiceTypeValues & { isActive: boolean }>,
) => {
  const [row] = await tx.update(serviceTypes).set(input).where(eq(serviceTypes.id, id)).returning();
  return row ?? null;
};

export const listAllCategories = async (tx: Tx) =>
  tx
    .select()
    .from(attendanceCategories)
    .orderBy(desc(attendanceCategories.isActive), asc(attendanceCategories.sortOrder));

export const getCategory = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(attendanceCategories).where(eq(attendanceCategories.id, id));
  return row ?? null;
};

export const createCategory = async (tx: Tx, input: { name: LocalizedText; color: string }) => {
  const [last] = await tx
    .select({ value: max(attendanceCategories.sortOrder) })
    .from(attendanceCategories);
  const [row] = await tx
    .insert(attendanceCategories)
    .values({ ...input, churchId: currentChurchId, sortOrder: (last?.value ?? -1) + 1 })
    .returning();
  if (!row) throw new Error("Insert failed");
  return row;
};

export const updateCategory = async (
  tx: Tx,
  id: string,
  input: Partial<{ name: LocalizedText; color: string; isActive: boolean }>,
) => {
  const [row] = await tx
    .update(attendanceCategories)
    .set(input)
    .where(eq(attendanceCategories.id, id))
    .returning();
  return row ?? null;
};

export const setCategoryOrder = async (tx: Tx, orderedIds: readonly string[]) => {
  for (const [index, id] of orderedIds.entries()) {
    await tx
      .update(attendanceCategories)
      .set({ sortOrder: index })
      .where(eq(attendanceCategories.id, id));
  }
};

export const setBrandTheme = async (tx: Tx, theme: BrandTheme | null) => {
  await tx
    .update(churches)
    .set({
      branding: sql`jsonb_set(${churches.branding}, '{theme}', ${JSON.stringify(theme)}::jsonb)`,
    })
    .where(eq(churches.id, currentChurchId));
};

const setLogoVersion = (tx: Tx, version: string | null) =>
  tx
    .update(churches)
    .set({
      branding: sql`jsonb_set(${churches.branding}, '{logoVersion}', ${JSON.stringify(version)}::jsonb)`,
    })
    .where(eq(churches.id, currentChurchId));

export const saveLogo = async (
  tx: Tx,
  logo: { contentType: LogoType; data: Uint8Array },
): Promise<string> => {
  const updatedAt = new Date();
  await tx
    .insert(churchLogos)
    .values({ churchId: currentChurchId, ...logo, updatedAt })
    .onConflictDoUpdate({ target: churchLogos.churchId, set: { ...logo, updatedAt } });
  const version = updatedAt.getTime().toString(36);
  await setLogoVersion(tx, version);
  return version;
};

export const removeLogo = async (tx: Tx) => {
  await tx.delete(churchLogos).where(eq(churchLogos.churchId, currentChurchId));
  await setLogoVersion(tx, null);
};

export const getLogo = async (tx: Tx) => {
  const [row] = await tx
    .select()
    .from(churchLogos)
    .where(eq(churchLogos.churchId, currentChurchId));
  return row ?? null;
};
