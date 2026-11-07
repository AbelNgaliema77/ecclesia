"use server";

import { audit, expenses, finance } from "@ecclesia/db/repositories";
import { broadestScope, can } from "@ecclesia/domain/access";
import {
  ATTACHMENT_KINDS,
  type AttachmentKind,
  canAttach,
  cancelExpense,
  checkAttachment,
  decideExpense,
  decisionInputSchema,
  expenseInputSchema,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_PER_EXPENSE,
  payExpense,
  paymentInputSchema,
  safeFileName,
} from "@ecclesia/domain/finance";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import {
  type ActionContext,
  ActionFailure,
  ensure,
  formToObject,
  parseInput,
  runChurchAction,
  unwrap,
} from "@/server/action";
import { churchToday, ensureOpen } from "./context";

const idSchema = z.uuid();
const kindSchema = z.enum(ATTACHMENT_KINDS);

const refresh = (id?: string) => {
  revalidatePath("/finance", "layout");
  if (id) revalidatePath(`/finance/expenses/${id}`);
};

const canSeeExpense = (
  ctx: ActionContext,
  expense: { requestedBy: string | null; teamId: string | null },
): boolean =>
  can(ctx.actor, "payments.approve") ||
  broadestScope(ctx.actor.grants, "payments.request") === "church" ||
  expense.requestedBy === ctx.user.id ||
  (expense.teamId !== null && ctx.actor.ledTeamIds.includes(expense.teamId));

const loadLocked = async (ctx: ActionContext, id: string) => {
  ensure(await expenses.lockExpense(ctx.tx, id), "notFound");
  const expense = await expenses.getExpense(ctx.tx, id);
  if (!expense || !canSeeExpense(ctx, expense)) throw new ActionFailure("notFound");
  return expense;
};

const expenseState = (expense: NonNullable<Awaited<ReturnType<typeof expenses.getExpense>>>) => ({
  status: expense.status,
  requestedBy: expense.requestedBy ?? "",
  amountCents: expense.amountCents,
  approvals: expense.approvals.map((a) => ({
    approverId: a.approverId ?? "",
    decision: a.decision,
  })),
});

const storeAttachment = async (
  ctx: ActionContext,
  requestId: string,
  kind: AttachmentKind,
  file: File,
) => {
  if (file.size === 0) throw new ActionFailure("finance.attachment.empty");
  if (file.size > MAX_ATTACHMENT_BYTES) throw new ActionFailure("finance.attachment.tooLarge");
  const count = await expenses.countAttachments(ctx.tx, requestId);
  ensure(count < MAX_ATTACHMENTS_PER_EXPENSE, "finance.attachment.tooMany");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkAttachment(bytes);
  if (!check.ok) throw new ActionFailure(check.code);
  const fileName = safeFileName(file.name, check.type);
  const id = await expenses.insertAttachment(
    ctx.tx,
    { requestId, kind, fileName, contentType: check.type, data: bytes },
    ctx.actor.userId,
  );
  await audit.recordAudit(ctx.tx, {
    actorUserId: ctx.actor.userId,
    action: "expense.attachmentAdded",
    entityType: "expense",
    entityId: requestId,
    after: { attachmentId: id, kind, fileName, contentType: check.type, bytes: bytes.byteLength },
  });
  return id;
};

export async function createExpenseAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "payments.request", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const input = parseInput(expenseInputSchema, formToObject(formData));
      const churchWide = broadestScope(actor.grants, "payments.request") === "church";
      if (!churchWide) {
        if (!input.teamId)
          throw new ActionFailure("validation", { teamId: ["finance.expense.teamRequired"] });
        ensure(actor.ledTeamIds.includes(input.teamId));
      }
      const [category, fund] = await Promise.all([
        finance.getCategory(tx, input.categoryId),
        finance.getFund(tx, input.fundId),
      ]);
      ensure(category?.isActive === true, "finance.categoryInactive");
      ensure(fund?.isActive === true, "finance.fundInactive");
      const created = await expenses.insertExpense(tx, input, actor.userId);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "expense.requested",
        entityType: "expense",
        entityId: created.id,
        after: input,
      });
      return { id: created.id };
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function uploadAttachmentAction(
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const expenseId = String(formData.get("expenseId") ?? "");
  const result = await runChurchAction(
    { permission: "payments.request", write: true },
    async (ctx) => {
      const id = parseInput(idSchema, expenseId);
      const kind = parseInput(kindSchema, formData.get("kind"));
      const file = formData.get("file");
      if (!(file instanceof File)) throw new ActionFailure("finance.attachment.empty");
      const expense = await loadLocked(ctx, id);
      ensure(canAttach(expense.status), "finance.expense.closed");
      ensure(kind !== "proofOfPayment" || can(ctx.actor, "payments.approve"));
      return { id: await storeAttachment(ctx, id, kind, file) };
    },
  );
  if (result.status === "success") refresh(expenseId);
  return result;
}

export async function uploadAttachmentFormAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  return uploadAttachmentAction(formData);
}

export async function deleteAttachmentAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const expenseId = String(formData.get("expenseId") ?? "");
  const result = await runChurchAction(
    { permission: "payments.request", write: true },
    async (ctx) => {
      const id = parseInput(idSchema, expenseId);
      const attachmentId = parseInput(idSchema, formData.get("attachmentId"));
      const expense = await loadLocked(ctx, id);
      const attachment = expense.attachments.find((a) => a.id === attachmentId);
      ensure(attachment !== undefined, "notFound");
      ensure(attachment?.uploadedBy === ctx.user.id);
      ensure(
        expense.status === "submitted" || expense.status === "approved",
        "finance.expense.closed",
      );
      await expenses.deleteAttachment(ctx.tx, attachmentId);
      await audit.recordAudit(ctx.tx, {
        actorUserId: ctx.actor.userId,
        action: "expense.attachmentRemoved",
        entityType: "expense",
        entityId: id,
        before: { attachmentId, fileName: attachment?.fileName, kind: attachment?.kind },
      });
      return null;
    },
  );
  if (result.status === "success") refresh(expenseId);
  return result;
}

export async function decideExpenseAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const expenseId = String(formData.get("id") ?? "");
  const result = await runChurchAction(
    { permission: "payments.approve", write: true },
    async (ctx) => {
      const id = parseInput(idSchema, expenseId);
      const input = parseInput(decisionInputSchema, formToObject(formData));
      const expense = await loadLocked(ctx, id);
      const settings = await finance.getSettings(ctx.tx);
      const status = unwrap(
        decideExpense(
          expenseState(expense),
          ctx.user.id,
          input.decision,
          settings.secondApprovalAboveCents,
        ),
      );
      await expenses.insertDecision(ctx.tx, {
        requestId: id,
        approverId: ctx.user.id,
        decision: input.decision,
        note: input.note || null,
      });
      if (status !== expense.status) await expenses.setStatus(ctx.tx, id, status);
      await audit.recordAudit(ctx.tx, {
        actorUserId: ctx.actor.userId,
        action: input.decision === "approve" ? "expense.approved" : "expense.rejected",
        entityType: "expense",
        entityId: id,
        before: { status: expense.status },
        after: { status, note: input.note || null },
      });
      return null;
    },
  );
  if (result.status === "success") refresh(expenseId);
  return result;
}

export async function payExpenseAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const expenseId = String(formData.get("id") ?? "");
  const result = await runChurchAction(
    { permission: "payments.approve", write: true },
    async (ctx) => {
      const id = parseInput(idSchema, expenseId);
      const input = parseInput(paymentInputSchema(churchToday(ctx)), formToObject(formData));
      const expense = await loadLocked(ctx, id);
      unwrap(payExpense(expenseState(expense), ctx.user.id));
      await ensureOpen(ctx.tx, input.paidOn);
      const proof = formData.get("proof");
      if (proof instanceof File && proof.size > 0)
        await storeAttachment(ctx, id, "proofOfPayment", proof);
      await expenses.markPaid(ctx.tx, id, input, ctx.user.id);
      await audit.recordAudit(ctx.tx, {
        actorUserId: ctx.actor.userId,
        action: "expense.paid",
        entityType: "expense",
        entityId: id,
        after: input,
      });
      return null;
    },
  );
  if (result.status === "success") refresh(expenseId);
  return result;
}

export async function cancelExpenseAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const expenseId = String(formData.get("id") ?? "");
  const result = await runChurchAction(
    { permission: "payments.request", write: true },
    async (ctx) => {
      const id = parseInput(idSchema, expenseId);
      const expense = await loadLocked(ctx, id);
      unwrap(cancelExpense(expenseState(expense), ctx.user.id));
      await expenses.setStatus(ctx.tx, id, "cancelled");
      await audit.recordAudit(ctx.tx, {
        actorUserId: ctx.actor.userId,
        action: "expense.cancelled",
        entityType: "expense",
        entityId: id,
      });
      return null;
    },
  );
  if (result.status === "success") refresh(expenseId);
  return result;
}
