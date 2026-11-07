"use server";

import { audit, finance, ledger } from "@ecclesia/db/repositories";
import { budgetLinesSchema, canCloseMonth, isIsoDate, monthOf } from "@ecclesia/domain/finance";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, parseInput, runChurchAction, unwrap } from "@/server/action";
import { churchToday } from "./context";

export async function saveBudgetAction(
  year: number,
  lines: readonly { categoryId: string; amount: string }[],
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "budgets.manage", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(budgetLinesSchema, { year, lines });
      const categories = new Set((await finance.listCategories(tx)).map((c) => c.id));
      ensure(
        input.lines.every((line) => categories.has(line.categoryId)),
        "notFound",
      );
      const before = Object.fromEntries(await ledger.budgetFor(tx, input.year));
      await ledger.saveBudget(
        tx,
        input.year,
        input.lines.map((line) => ({ categoryId: line.categoryId, amountCents: line.amount })),
      );
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "budget.saved",
        entityType: "budget",
        entityId: null,
        before,
        after: { year: input.year, lines: input.lines },
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/finance", "layout");
  return result;
}

const monthSchema = z
  .string()
  .refine(isIsoDate, "invalidDate")
  .transform((value) => monthOf(value));

export async function setMonthClosedAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "finance.manage", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const month = parseInput(monthSchema, formData.get("month"));
      const close = formData.get("close") === "true";
      if (close) {
        unwrap(canCloseMonth(month, churchToday(ctx)));
        ensure(await finance.closeMonth(tx, month, actor.userId), "finance.alreadyClosed");
      } else {
        const { reason } = parseInput(
          z.object({ reason: z.string().trim().min(3, "finance.reasonRequired").max(300) }),
          {
            reason: formData.get("reason"),
          },
        );
        ensure(await finance.reopenMonth(tx, month), "notFound");
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "period.reopened",
          entityType: "financePeriod",
          entityId: null,
          after: { month, reason },
        });
        return null;
      }
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "period.closed",
        entityType: "financePeriod",
        entityId: null,
        after: { month },
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/finance", "layout");
  return result;
}
