"use server";

import { attendance, audit, finance, giving, people } from "@ecclesia/db/repositories";
import {
  batchInputSchema,
  canEditBatch,
  returnBatch,
  submitBatch,
  verifyBatch,
  voidReasonSchema,
} from "@ecclesia/domain/finance";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import {
  type ActionContext,
  ActionFailure,
  ensure,
  parseInput,
  runChurchAction,
  unwrap,
} from "@/server/action";
import { churchToday, ensureOpen } from "./context";

const idSchema = z.uuid();

const refresh = (id?: string) => {
  revalidatePath("/finance", "layout");
  if (id) revalidatePath(`/finance/counts/${id}`);
};

const loadEditable = async ({ tx }: ActionContext, id: string) => {
  ensure(await giving.lockBatch(tx, id), "notFound");
  const batch = await giving.getBatch(tx, id);
  if (!batch) throw new ActionFailure("notFound");
  return batch;
};

const batchState = (batch: NonNullable<Awaited<ReturnType<typeof giving.getBatch>>>) => ({
  status: batch.status,
  createdBy: batch.createdBy ?? "",
  submittedBy: batch.submittedBy,
  lineCount: batch.lines.length,
});

export async function createBatchAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const input = parseInput(batchInputSchema(churchToday(ctx)), {
        receivedOn: formData.get("receivedOn"),
        serviceId: formData.get("serviceId"),
        notes: formData.get("notes") ?? "",
        lines: [],
      });
      await ensureOpen(tx, input.receivedOn);
      if (input.serviceId) {
        const services = await attendance.listRecentServices(tx, 60);
        ensure(
          services.some((s) => s.id === input.serviceId),
          "notFound",
        );
      }
      const batch = await giving.insertBatch(
        tx,
        { receivedOn: input.receivedOn, serviceId: input.serviceId, notes: input.notes || null },
        actor.userId,
      );
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "batch.created",
        entityType: "giftBatch",
        entityId: batch.id,
        after: input,
      });
      return { id: batch.id };
    },
  );
  if (result.status !== "success") return result;
  refresh();
  redirect(`/finance/counts/${result.data.id}`);
}

export async function saveBatchAction(
  batchId: string,
  payload: {
    receivedOn: string;
    notes: string;
    lines: { fundId: string; personId: string | null; amount: string }[];
  },
  submit: boolean,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const id = parseInput(idSchema, batchId);
      const batch = await loadEditable(ctx, id);
      unwrap(canEditBatch(batchState(batch)));
      const input = parseInput(batchInputSchema(churchToday(ctx)), {
        receivedOn: payload.receivedOn,
        serviceId: batch.serviceId,
        notes: payload.notes,
        lines: payload.lines,
      });
      await ensureOpen(tx, batch.receivedOn, input.receivedOn);
      const funds = await finance.listFunds(tx);
      for (const line of input.lines) {
        const fund = funds.find((f) => f.id === line.fundId);
        ensure(fund?.isActive === true, "finance.fundInactive");
      }
      const personIds = [
        ...new Set(input.lines.flatMap((line) => (line.personId ? [line.personId] : []))),
      ];
      ensure((await people.existingIds(tx, personIds)).size === personIds.length, "notFound");
      await giving.updateBatchDetails(tx, id, {
        receivedOn: input.receivedOn,
        serviceId: batch.serviceId,
        notes: input.notes || null,
      });
      await giving.replaceBatchLines(tx, id, input.lines);
      if (submit) {
        unwrap(submitBatch({ ...batchState(batch), lineCount: input.lines.length }));
        await giving.setBatchStatus(tx, id, "submitted", actor.userId);
      }
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: submit ? "batch.submitted" : "batch.saved",
        entityType: "giftBatch",
        entityId: id,
        before: {
          lines: batch.lines.map((l) => ({
            fundId: l.fundId,
            personId: l.personId,
            amountCents: l.amountCents,
          })),
        },
        after: { receivedOn: input.receivedOn, lines: input.lines },
      });
      return null;
    },
  );
  if (result.status === "success") refresh(batchId);
  return result;
}

export async function verifyBatchAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const batchId = String(formData.get("id") ?? "");
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const id = parseInput(idSchema, batchId);
      const batch = await loadEditable(ctx, id);
      unwrap(verifyBatch(batchState(batch), actor.userId));
      await ensureOpen(tx, batch.receivedOn);
      await giving.setBatchStatus(tx, id, "verified", actor.userId);
      const created = await giving.insertGifts(
        tx,
        batch.lines.map((line) => ({
          fundId: line.fundId,
          personId: line.personId,
          method: "cash" as const,
          amountCents: line.amountCents,
          receivedOn: batch.receivedOn,
          reference: null,
          batchId: id,
        })),
        actor.userId,
      );
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "batch.verified",
        entityType: "giftBatch",
        entityId: id,
        after: {
          gifts: created.length,
          totalCents: batch.lines.reduce((sum, l) => sum + l.amountCents, 0),
        },
      });
      return null;
    },
  );
  if (result.status === "success") refresh(batchId);
  return result;
}

export async function returnBatchAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const batchId = String(formData.get("id") ?? "");
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const id = parseInput(idSchema, batchId);
      const reason = parseInput(z.object({ reason: voidReasonSchema }), {
        reason: formData.get("reason"),
      }).reason;
      const batch = await loadEditable(ctx, id);
      unwrap(returnBatch(batchState(batch), actor.userId));
      await giving.setBatchStatus(tx, id, "draft", actor.userId, reason);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "batch.returned",
        entityType: "giftBatch",
        entityId: id,
        after: { reason },
      });
      return null;
    },
  );
  if (result.status === "success") refresh(batchId);
  return result;
}

export async function deleteBatchAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async ({ tx, actor }) => {
      const id = parseInput(idSchema, formData.get("id"));
      const batch = await giving.getBatch(tx, id);
      ensure(batch !== null, "notFound");
      ensure(batch?.status === "draft", "finance.batch.locked");
      ensure(await giving.deleteDraftBatch(tx, id), "finance.batch.locked");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "batch.deleted",
        entityType: "giftBatch",
        entityId: id,
        before: batch,
      });
      return null;
    },
  );
  if (result.status !== "success") return result;
  refresh();
  redirect("/finance/counts");
}
