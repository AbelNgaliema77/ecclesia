import type { BudgetRow } from "@ecclesia/domain/finance";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { formatMoney } from "./money";

const FILL: Record<BudgetRow["state"], string> = {
  under: "bg-brand",
  near: "bg-gold",
  over: "bg-danger",
  unbudgeted: "bg-line-strong",
};

export function BudgetBar({
  label,
  row,
  currency,
}: {
  label: string;
  row: BudgetRow;
  currency: string;
}) {
  const t = useTranslations("finance.budgets");
  const format = useFormatter();
  const width =
    row.budgetCents > 0
      ? Math.min(100, (row.actualCents / row.budgetCents) * 100)
      : row.actualCents > 0
        ? 100
        : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className="text-ink-soft tabular-nums">
          {t("spentOf", {
            spent: formatMoney(format, row.actualCents, currency),
            budget: formatMoney(format, row.budgetCents, currency),
          })}
        </span>
      </div>
      <div aria-hidden className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width]", FILL[row.state])}
          style={{ width: `${width}%` }}
        />
      </div>
      <p
        className={cn(
          "text-xs",
          row.state === "over" ? "font-semibold text-danger" : "text-ink-faint",
        )}
      >
        {row.state === "unbudgeted"
          ? t("state.unbudgeted")
          : row.state === "over"
            ? t("overBy", { amount: formatMoney(format, -row.remainingCents, currency) })
            : t("left", {
                amount: formatMoney(format, row.remainingCents, currency),
                percent: row.usedPercent ?? 0,
              })}
      </p>
    </div>
  );
}
