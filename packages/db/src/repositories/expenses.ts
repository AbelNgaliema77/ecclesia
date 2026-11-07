import type {
  AttachmentKind,
  AttachmentType,
  ExpenseDecision,
  ExpenseInput,
  ExpenseStatus,
  IsoDate,
} from "@ecclesia/domain/finance";
import { and, asc, desc, eq, gte, inArray, lte, or, type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { currentChurchId, type Tx } from "../client";
import {
  expenseApprovals,
  expenseAttachments,
  expenseCategories,
  expenseRequests,
  funds,
  teams,
  user,
} from "../schema";

const requester = alias(user, "requester");
const payer = alias(user, "payer");

export const insertExpense = async (tx: Tx, input: ExpenseInput, actorUserId: string) => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('expense_number:' || ${currentChurchId}::text))`,
  );
  const [max] = await tx
    .select({ value: sql<number>`coalesce(max(${expenseRequests.number}), 0)::int` })
    .from(expenseRequests);
  const [row] = await tx
    .insert(expenseRequests)
    .values({
      churchId: currentChurchId,
      number: (max?.value ?? 0) + 1,
      title: input.title,
      description: input.description || null,
      payee: input.payee,
      amountCents: input.amount,
      categoryId: input.categoryId,
      fundId: input.fundId,
      teamId: input.teamId,
      neededBy: input.neededBy,
      requestedBy: actorUserId,
    })
    .returning({ id: expenseRequests.id, number: expenseRequests.number });
  if (!row) throw new Error("Expense insert failed");
  return row;
};

const summaryColumns = {
  id: expenseRequests.id,
  number: expenseRequests.number,
  title: expenseRequests.title,
  payee: expenseRequests.payee,
  amountCents: expenseRequests.amountCents,
  status: expenseRequests.status,
  categoryId: expenseRequests.categoryId,
  categoryName: expenseCategories.name,
  fundId: expenseRequests.fundId,
  fundName: funds.name,
  teamId: expenseRequests.teamId,
  teamName: teams.name,
  neededBy: expenseRequests.neededBy,
  requestedBy: expenseRequests.requestedBy,
  requestedByName: requester.name,
  createdAt: expenseRequests.createdAt,
  paidOn: expenseRequests.paidOn,
};

export type ExpenseScope =
  | { readonly kind: "church" }
  | { readonly kind: "own"; readonly userId: string; readonly teamIds: readonly string[] };

const scopeClause = (scope: ExpenseScope): SQL | undefined =>
  scope.kind === "church"
    ? undefined
    : or(
        eq(expenseRequests.requestedBy, scope.userId),
        scope.teamIds.length > 0 ? inArray(expenseRequests.teamId, [...scope.teamIds]) : undefined,
      );

export type ExpenseQuery = {
  readonly scope: ExpenseScope;
  readonly statuses?: readonly ExpenseStatus[] | null;
  readonly awaitingUserId?: string | null;
  readonly limit: number;
  readonly offset: number;
};

export const listExpenses = async (tx: Tx, query: ExpenseQuery) => {
  const where = and(
    scopeClause(query.scope),
    query.statuses && query.statuses.length > 0
      ? inArray(expenseRequests.status, [...query.statuses])
      : undefined,
    query.awaitingUserId
      ? and(
          eq(expenseRequests.status, "submitted"),
          sql`${expenseRequests.requestedBy} is distinct from ${query.awaitingUserId}`,
          sql`not exists (select 1 from ${expenseApprovals} a where a.request_id = ${expenseRequests.id} and a.approver_id = ${query.awaitingUserId})`,
        )
      : undefined,
  );
  const [rows, [count]] = await Promise.all([
    tx
      .select({
        ...summaryColumns,
        approvals: sql<number>`(select count(*) from ${expenseApprovals} a where a.request_id = ${expenseRequests.id} and a.decision = 'approve')::int`,
        attachments: sql<number>`(select count(*) from ${expenseAttachments} f where f.request_id = ${expenseRequests.id})::int`,
      })
      .from(expenseRequests)
      .innerJoin(expenseCategories, eq(expenseCategories.id, expenseRequests.categoryId))
      .innerJoin(funds, eq(funds.id, expenseRequests.fundId))
      .leftJoin(teams, eq(teams.id, expenseRequests.teamId))
      .leftJoin(requester, eq(requester.id, expenseRequests.requestedBy))
      .where(where)
      .orderBy(desc(expenseRequests.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    tx.select({ value: sql<number>`count(*)::int` }).from(expenseRequests).where(where),
  ]);
  return { rows, total: count?.value ?? 0 };
};

export const getExpense = async (tx: Tx, id: string) => {
  const [row] = await tx
    .select({
      ...summaryColumns,
      description: expenseRequests.description,
      decidedAt: expenseRequests.decidedAt,
      paidByName: payer.name,
      paidAt: expenseRequests.paidAt,
      paymentReference: expenseRequests.paymentReference,
    })
    .from(expenseRequests)
    .innerJoin(expenseCategories, eq(expenseCategories.id, expenseRequests.categoryId))
    .innerJoin(funds, eq(funds.id, expenseRequests.fundId))
    .leftJoin(teams, eq(teams.id, expenseRequests.teamId))
    .leftJoin(requester, eq(requester.id, expenseRequests.requestedBy))
    .leftJoin(payer, eq(payer.id, expenseRequests.paidBy))
    .where(eq(expenseRequests.id, id));
  if (!row) return null;
  const [approvals, attachments] = await Promise.all([
    tx
      .select({
        approverId: expenseApprovals.approverId,
        approverName: user.name,
        decision: expenseApprovals.decision,
        note: expenseApprovals.note,
        createdAt: expenseApprovals.createdAt,
      })
      .from(expenseApprovals)
      .leftJoin(user, eq(user.id, expenseApprovals.approverId))
      .where(eq(expenseApprovals.requestId, id))
      .orderBy(asc(expenseApprovals.createdAt)),
    listAttachments(tx, id),
  ]);
  return { ...row, approvals, attachments };
};

export type ExpenseDetail = NonNullable<Awaited<ReturnType<typeof getExpense>>>;

export const lockExpense = async (tx: Tx, id: string) => {
  const [row] = await tx
    .select({ id: expenseRequests.id })
    .from(expenseRequests)
    .where(eq(expenseRequests.id, id))
    .for("update");
  return row !== undefined;
};

export const insertDecision = (
  tx: Tx,
  input: { requestId: string; approverId: string; decision: ExpenseDecision; note: string | null },
) => tx.insert(expenseApprovals).values({ churchId: currentChurchId, ...input });

export const setStatus = (tx: Tx, id: string, status: ExpenseStatus) =>
  tx
    .update(expenseRequests)
    .set({
      status,
      decidedAt: status === "approved" || status === "rejected" ? sql`now()` : undefined,
    })
    .where(eq(expenseRequests.id, id));

export const markPaid = (
  tx: Tx,
  id: string,
  input: { paidOn: IsoDate; reference: string },
  actorUserId: string,
) =>
  tx
    .update(expenseRequests)
    .set({
      status: "paid",
      paidOn: input.paidOn,
      paymentReference: input.reference,
      paidBy: actorUserId,
      paidAt: sql`now()`,
    })
    .where(and(eq(expenseRequests.id, id), eq(expenseRequests.status, "approved")));

export const listAttachments = (tx: Tx, requestId: string) =>
  tx
    .select({
      id: expenseAttachments.id,
      kind: expenseAttachments.kind,
      fileName: expenseAttachments.fileName,
      contentType: expenseAttachments.contentType,
      byteSize: expenseAttachments.byteSize,
      uploadedBy: expenseAttachments.uploadedBy,
      uploadedByName: user.name,
      createdAt: expenseAttachments.createdAt,
    })
    .from(expenseAttachments)
    .leftJoin(user, eq(user.id, expenseAttachments.uploadedBy))
    .where(eq(expenseAttachments.requestId, requestId))
    .orderBy(asc(expenseAttachments.createdAt));

export const countAttachments = async (tx: Tx, requestId: string) => {
  const [row] = await tx
    .select({ value: sql<number>`count(*)::int` })
    .from(expenseAttachments)
    .where(eq(expenseAttachments.requestId, requestId));
  return row?.value ?? 0;
};

export const insertAttachment = async (
  tx: Tx,
  input: {
    requestId: string;
    kind: AttachmentKind;
    fileName: string;
    contentType: AttachmentType;
    data: Uint8Array;
  },
  actorUserId: string,
) => {
  const [row] = await tx
    .insert(expenseAttachments)
    .values({
      churchId: currentChurchId,
      ...input,
      byteSize: input.data.byteLength,
      uploadedBy: actorUserId,
    })
    .returning({ id: expenseAttachments.id });
  if (!row) throw new Error("Attachment insert failed");
  return row.id;
};

export const getAttachment = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(expenseAttachments).where(eq(expenseAttachments.id, id));
  return row ?? null;
};

export const deleteAttachment = async (tx: Tx, id: string) => {
  const rows = await tx
    .delete(expenseAttachments)
    .where(eq(expenseAttachments.id, id))
    .returning({ id: expenseAttachments.id });
  return rows.length > 0;
};

export const paidByCategory = (tx: Tx, from: IsoDate, to: IsoDate) =>
  tx
    .select({
      categoryId: expenseRequests.categoryId,
      totalCents: sql<number>`coalesce(sum(${expenseRequests.amountCents}), 0)::bigint`.mapWith(
        Number,
      ),
    })
    .from(expenseRequests)
    .where(
      and(
        eq(expenseRequests.status, "paid"),
        gte(expenseRequests.paidOn, from),
        lte(expenseRequests.paidOn, to),
      ),
    )
    .groupBy(expenseRequests.categoryId);

export const paidByMonth = (tx: Tx, from: IsoDate, to: IsoDate) =>
  tx
    .select({
      month: sql<string>`to_char(${expenseRequests.paidOn}, 'YYYY-MM')`,
      totalCents: sql<number>`coalesce(sum(${expenseRequests.amountCents}), 0)::bigint`.mapWith(
        Number,
      ),
    })
    .from(expenseRequests)
    .where(
      and(
        eq(expenseRequests.status, "paid"),
        gte(expenseRequests.paidOn, from),
        lte(expenseRequests.paidOn, to),
      ),
    )
    .groupBy(sql`1`);

export const pendingCounts = async (tx: Tx, userId: string) => {
  const [row] = await tx
    .select({
      awaitingApproval: sql<number>`count(*) filter (where ${expenseRequests.status} = 'submitted'
        and ${expenseRequests.requestedBy} is distinct from ${userId}
        and not exists (select 1 from ${expenseApprovals} a where a.request_id = ${expenseRequests.id} and a.approver_id = ${userId}))::int`,
      awaitingPayment: sql<number>`count(*) filter (where ${expenseRequests.status} = 'approved')::int`,
      approvedCents:
        sql<number>`coalesce(sum(${expenseRequests.amountCents}) filter (where ${expenseRequests.status} = 'approved'), 0)::bigint`.mapWith(
          Number,
        ),
    })
    .from(expenseRequests);
  return row ?? { awaitingApproval: 0, awaitingPayment: 0, approvedCents: 0 };
};
