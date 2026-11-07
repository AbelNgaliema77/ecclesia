import { z } from "zod";
import { domainError, err, ok, type Result } from "../shared/result";
import { type IsoDate, isIsoDate, pastDateSchema } from "./dates";
import { amountSchema } from "./money";

export const EXPENSE_STATUSES = ["submitted", "approved", "rejected", "paid", "cancelled"] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_DECISIONS = ["approve", "reject"] as const;

export type ExpenseDecision = (typeof EXPENSE_DECISIONS)[number];

const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .nullish()
  .transform((value) => (value ? value : null));

export const expenseInputSchema = z.object({
  title: z.string().trim().min(3, "required").max(120),
  description: z.string().trim().max(2000).default(""),
  payee: z.string().trim().min(2, "required").max(120),
  amount: amountSchema,
  categoryId: z.uuid("required"),
  fundId: z.uuid("required"),
  teamId: optionalUuid,
  neededBy: z
    .union([z.literal(""), z.string().refine(isIsoDate, "invalidDate")])
    .nullish()
    .transform((value) => (value ? value : null)),
});

export type ExpenseInput = z.output<typeof expenseInputSchema>;

export const decisionInputSchema = z
  .object({
    decision: z.enum(EXPENSE_DECISIONS),
    note: z.string().trim().max(500).default(""),
  })
  .refine((value) => value.decision === "approve" || value.note.length >= 3, {
    message: "finance.reasonRequired",
    path: ["note"],
  });

export const paymentInputSchema = (today: IsoDate) =>
  z.object({
    paidOn: pastDateSchema(today),
    reference: z.string().trim().min(2, "required").max(80),
  });

export type ExpenseState = {
  readonly status: ExpenseStatus;
  readonly requestedBy: string;
  readonly amountCents: number;
  readonly approvals: readonly {
    readonly approverId: string;
    readonly decision: ExpenseDecision;
  }[];
};

export const approvalsRequired = (
  amountCents: number,
  secondApprovalAbove: number | null,
): 1 | 2 => (secondApprovalAbove !== null && amountCents > secondApprovalAbove ? 2 : 1);

export const approvalsGiven = (expense: ExpenseState): number =>
  expense.approvals.filter((a) => a.decision === "approve").length;

export const decideExpense = (
  expense: ExpenseState,
  actorUserId: string,
  decision: ExpenseDecision,
  secondApprovalAbove: number | null,
): Result<ExpenseStatus> => {
  if (expense.status !== "submitted") {
    return err(
      domainError("finance.expense.notPending", "This request is no longer waiting for approval"),
    );
  }
  if (expense.requestedBy === actorUserId) {
    return err(domainError("finance.expense.ownRequest", "You cannot approve your own request"));
  }
  if (expense.approvals.some((a) => a.approverId === actorUserId)) {
    return err(
      domainError("finance.expense.alreadyDecided", "You have already approved this request"),
    );
  }
  if (decision === "reject") return ok("rejected");
  const needed = approvalsRequired(expense.amountCents, secondApprovalAbove);
  return ok(approvalsGiven(expense) + 1 >= needed ? "approved" : "submitted");
};

export const payExpense = (expense: ExpenseState, actorUserId: string): Result<"paid"> => {
  if (expense.status !== "approved") {
    return err(domainError("finance.expense.notApproved", "Only approved requests can be paid"));
  }
  if (expense.requestedBy === actorUserId) {
    return err(domainError("finance.expense.ownRequest", "Someone else must pay your request"));
  }
  return ok("paid");
};

export const cancelExpense = (expense: ExpenseState, actorUserId: string): Result<"cancelled"> => {
  if (expense.requestedBy !== actorUserId) {
    return err(domainError("forbidden", "Only the requester can cancel"));
  }
  if (expense.status !== "submitted") {
    return err(
      domainError("finance.expense.notPending", "This request can no longer be cancelled"),
    );
  }
  return ok("cancelled");
};

export const canAttach = (status: ExpenseStatus): boolean =>
  status === "submitted" || status === "approved" || status === "paid";

export const formatExpenseNumber = (number: number): string =>
  `EXP-${String(number).padStart(4, "0")}`;
