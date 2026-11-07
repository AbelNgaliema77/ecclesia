import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_FUNDS,
  type ExpenseCategoryInput,
  type FundInput,
  type IsoDate,
} from "@ecclesia/domain/finance";
import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { expenseCategories, financePeriods, financeSettings, funds, user } from "../schema";

export type FinanceSettings = {
  readonly defaultFundId: string | null;
  readonly financeTeamId: string | null;
  readonly secondApprovalAboveCents: number | null;
  readonly requireTwoFactor: boolean;
  readonly legalName: string | null;
  readonly pboNumber: string | null;
  readonly address: string | null;
  readonly signatoryName: string | null;
};

const DEFAULT_SETTINGS: FinanceSettings = {
  defaultFundId: null,
  financeTeamId: null,
  secondApprovalAboveCents: null,
  requireTwoFactor: true,
  legalName: null,
  pboNumber: null,
  address: null,
  signatoryName: null,
};

export const getSettings = async (tx: Tx): Promise<FinanceSettings> => {
  const [row] = await tx
    .select({
      defaultFundId: financeSettings.defaultFundId,
      financeTeamId: financeSettings.financeTeamId,
      secondApprovalAboveCents: financeSettings.secondApprovalAboveCents,
      requireTwoFactor: financeSettings.requireTwoFactor,
      legalName: financeSettings.legalName,
      pboNumber: financeSettings.pboNumber,
      address: financeSettings.address,
      signatoryName: financeSettings.signatoryName,
    })
    .from(financeSettings)
    .where(eq(financeSettings.churchId, currentChurchId));
  return row ?? DEFAULT_SETTINGS;
};

export const saveSettings = async (tx: Tx, patch: Partial<FinanceSettings>) => {
  await tx
    .insert(financeSettings)
    .values({ churchId: currentChurchId, ...patch })
    .onConflictDoUpdate({ target: financeSettings.churchId, set: patch });
};

export const provisionFinance = async (tx: Tx) => {
  const fundRows = await tx
    .insert(funds)
    .values(DEFAULT_FUNDS.map((fund) => ({ churchId: currentChurchId, ...fund })))
    .returning({ id: funds.id, code: funds.code });
  await tx
    .insert(expenseCategories)
    .values(
      DEFAULT_EXPENSE_CATEGORIES.map((category) => ({ churchId: currentChurchId, ...category })),
    );
  await saveSettings(tx, { defaultFundId: fundRows.find((f) => f.code === "TITHE")?.id ?? null });
};

export const listFunds = (tx: Tx, options: { activeOnly?: boolean } = {}) =>
  tx
    .select()
    .from(funds)
    .where(options.activeOnly ? eq(funds.isActive, true) : undefined)
    .orderBy(asc(funds.sortOrder), sql`${funds.name}->>'en'`);

export type Fund = Awaited<ReturnType<typeof listFunds>>[number];

export const getFund = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(funds).where(eq(funds.id, id));
  return row ?? null;
};

export const fundCodeTaken = async (tx: Tx, code: string, exceptId: string | null) => {
  const [row] = await tx.select({ id: funds.id }).from(funds).where(eq(funds.code, code));
  return row !== undefined && row.id !== exceptId;
};

export const insertFund = async (tx: Tx, input: FundInput) => {
  const [max] = await tx
    .select({ value: sql<number>`coalesce(max(${funds.sortOrder}), -1)::int` })
    .from(funds);
  const [row] = await tx
    .insert(funds)
    .values({ churchId: currentChurchId, ...input, sortOrder: (max?.value ?? -1) + 1 })
    .returning();
  if (!row) throw new Error("Fund insert failed");
  return row;
};

export const updateFund = async (tx: Tx, id: string, input: FundInput) => {
  const [row] = await tx.update(funds).set(input).where(eq(funds.id, id)).returning();
  return row ?? null;
};

export const listCategories = (tx: Tx, options: { activeOnly?: boolean } = {}) =>
  tx
    .select()
    .from(expenseCategories)
    .where(options.activeOnly ? eq(expenseCategories.isActive, true) : undefined)
    .orderBy(asc(expenseCategories.sortOrder), sql`${expenseCategories.name}->>'en'`);

export type ExpenseCategory = Awaited<ReturnType<typeof listCategories>>[number];

export const getCategory = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(expenseCategories).where(eq(expenseCategories.id, id));
  return row ?? null;
};

export const insertCategory = async (tx: Tx, input: ExpenseCategoryInput) => {
  const [max] = await tx
    .select({ value: sql<number>`coalesce(max(${expenseCategories.sortOrder}), -1)::int` })
    .from(expenseCategories);
  const [row] = await tx
    .insert(expenseCategories)
    .values({ churchId: currentChurchId, ...input, sortOrder: (max?.value ?? -1) + 1 })
    .returning();
  if (!row) throw new Error("Category insert failed");
  return row;
};

export const updateCategory = async (tx: Tx, id: string, input: ExpenseCategoryInput) => {
  const [row] = await tx
    .update(expenseCategories)
    .set(input)
    .where(eq(expenseCategories.id, id))
    .returning();
  return row ?? null;
};

export const closedMonths = async (
  tx: Tx,
  range?: { from: IsoDate; to: IsoDate },
): Promise<Set<IsoDate>> => {
  const rows = await tx
    .select({ month: financePeriods.month })
    .from(financePeriods)
    .where(
      range
        ? and(
            gte(financePeriods.month, `${range.from.slice(0, 7)}-01`),
            lte(financePeriods.month, range.to),
          )
        : undefined,
    );
  return new Set(rows.map((r) => r.month));
};

export const listPeriods = (tx: Tx) =>
  tx
    .select({
      month: financePeriods.month,
      closedAt: financePeriods.closedAt,
      closedByName: user.name,
    })
    .from(financePeriods)
    .leftJoin(user, eq(user.id, financePeriods.closedBy))
    .orderBy(desc(financePeriods.month));

export const closeMonth = async (tx: Tx, month: IsoDate, actorUserId: string) => {
  const rows = await tx
    .insert(financePeriods)
    .values({ churchId: currentChurchId, month, closedBy: actorUserId })
    .onConflictDoNothing()
    .returning({ month: financePeriods.month });
  return rows.length > 0;
};

export const reopenMonth = async (tx: Tx, month: IsoDate) => {
  const rows = await tx
    .delete(financePeriods)
    .where(eq(financePeriods.month, month))
    .returning({ month: financePeriods.month });
  return rows.length > 0;
};
