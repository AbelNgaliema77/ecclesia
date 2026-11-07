import { z } from "zod";
import { domainError, err, ok, type Result } from "../shared/result";
import { type IsoDate, pastDateSchema } from "./dates";
import { amountSchema } from "./money";

export const BATCH_STATUSES = ["draft", "submitted", "verified"] as const;

export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const MAX_BATCH_LINES = 500;

const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .nullish()
  .transform((value) => (value ? value : null));

export const batchLineSchema = z.object({
  fundId: z.uuid("required"),
  personId: optionalUuid,
  amount: amountSchema,
});

export type BatchLine = z.output<typeof batchLineSchema>;

export const batchInputSchema = (today: IsoDate) =>
  z.object({
    receivedOn: pastDateSchema(today),
    serviceId: optionalUuid,
    notes: z.string().trim().max(500).default(""),
    lines: z.array(batchLineSchema).max(MAX_BATCH_LINES, "finance.batch.tooManyLines"),
  });

export type BatchInput = z.output<ReturnType<typeof batchInputSchema>>;

export type BatchState = {
  readonly status: BatchStatus;
  readonly createdBy: string;
  readonly submittedBy: string | null;
  readonly lineCount: number;
};

export const canEditBatch = (batch: BatchState): Result<true> =>
  batch.status === "draft" ? ok(true) : err(domainError("finance.batch.locked", "Batch is locked"));

export const submitBatch = (batch: BatchState): Result<"submitted"> => {
  if (batch.status !== "draft") return err(domainError("finance.batch.locked", "Batch is locked"));
  if (batch.lineCount === 0) return err(domainError("finance.batch.empty", "Batch has no lines"));
  return ok("submitted");
};

const checkSecondCounter = (batch: BatchState, actorUserId: string): Result<true> => {
  if (batch.status !== "submitted") {
    return err(domainError("finance.batch.notSubmitted", "Batch is not waiting for verification"));
  }
  if (batch.submittedBy === actorUserId) {
    return err(domainError("finance.batch.sameCounter", "A second person must verify the count"));
  }
  return ok(true);
};

export const verifyBatch = (batch: BatchState, actorUserId: string): Result<"verified"> => {
  const check = checkSecondCounter(batch, actorUserId);
  return check.ok ? ok("verified") : check;
};

export const returnBatch = (batch: BatchState, actorUserId: string): Result<"draft"> => {
  const check = checkSecondCounter(batch, actorUserId);
  return check.ok ? ok("draft") : check;
};

export const totalsByFund = (lines: readonly { fundId: string; amountCents: number }[]) => {
  const totals = new Map<string, number>();
  for (const line of lines)
    totals.set(line.fundId, (totals.get(line.fundId) ?? 0) + line.amountCents);
  return totals;
};
