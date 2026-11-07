import { z } from "zod";
import { optionalAmountSchema } from "./money";

export const budgetYearSchema = z.coerce.number().int().min(2000).max(2100);

export const budgetLinesSchema = z.object({
  year: budgetYearSchema,
  lines: z.array(z.object({ categoryId: z.uuid(), amount: optionalAmountSchema })).max(200),
});

export type BudgetRow = {
  readonly categoryId: string;
  readonly budgetCents: number;
  readonly actualCents: number;
  readonly remainingCents: number;
  readonly usedPercent: number | null;
  readonly state: "under" | "near" | "over" | "unbudgeted";
};

export const NEAR_BUDGET_PERCENT = 90;

export const compareBudget = (
  categoryIds: readonly string[],
  budgets: ReadonlyMap<string, number>,
  actuals: ReadonlyMap<string, number>,
): BudgetRow[] =>
  categoryIds.map((categoryId) => {
    const budgetCents = budgets.get(categoryId) ?? 0;
    const actualCents = actuals.get(categoryId) ?? 0;
    const usedPercent =
      budgetCents > 0 ? Math.round((actualCents / budgetCents) * 1000) / 10 : null;
    const state =
      budgetCents === 0
        ? actualCents > 0
          ? "over"
          : "unbudgeted"
        : actualCents > budgetCents
          ? "over"
          : (usedPercent ?? 0) >= NEAR_BUDGET_PERCENT
            ? "near"
            : "under";
    return {
      categoryId,
      budgetCents,
      actualCents,
      remainingCents: budgetCents - actualCents,
      usedPercent,
      state,
    };
  });
