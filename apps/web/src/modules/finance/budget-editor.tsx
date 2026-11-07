"use client";

import { type BudgetRow, parseAmount } from "@ecclesia/domain/finance";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { localized } from "@/i18n/config";
import { type ActionState, idleState } from "@/lib/action-state";
import { BudgetBar } from "./budget-bar";
import { saveBudgetAction } from "./ledger-actions";
import { centsToInput, formatMoney } from "./money";

type Category = { id: string; name: { en: string; fr: string }; isActive: boolean };

export function BudgetEditor({
  year,
  categories,
  rows,
  currency,
  canEdit,
}: {
  year: number;
  categories: readonly Category[];
  rows: readonly BudgetRow[];
  currency: string;
  canEdit: boolean;
}) {
  const t = useTranslations("finance.budgets");
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      rows.map((row) => [row.categoryId, row.budgetCents > 0 ? centsToInput(row.budgetCents) : ""]),
    ),
  );
  const [state, setState] = useState<ActionState<null>>(idleState);
  const [pending, startTransition] = useTransition();
  const { formError } = useActionMessages(state);
  const invalid = new Set(
    Object.entries(values)
      .filter(([, v]) => v.trim() !== "" && parseAmount(v) === null)
      .map(([k]) => k),
  );
  const total = Object.values(values).reduce((sum, v) => sum + (parseAmount(v) ?? 0), 0);
  const spent = rows.reduce((sum, row) => sum + row.actualCents, 0);
  const dirty = rows.some(
    (row) => (parseAmount(values[row.categoryId] ?? "") ?? 0) !== row.budgetCents,
  );

  const save = () =>
    startTransition(async () => {
      const result = await saveBudgetAction(
        year,
        rows.map((row) => ({ categoryId: row.categoryId, amount: values[row.categoryId] ?? "" })),
      );
      setState(result);
      if (result.status === "success") {
        toast.success(t("saved"));
        router.refresh();
      }
    });

  return (
    <div className="flex flex-col gap-5">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <section className="card divide-y divide-line">
        {rows.map((row) => {
          const category = categories.find((c) => c.id === row.categoryId);
          const label = category ? localized(category.name, locale) : "";
          return (
            <div
              key={row.categoryId}
              className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center"
            >
              <BudgetBar label={label} row={row} currency={currency} />
              {canEdit ? (
                <div>
                  <label htmlFor={`budget-${row.categoryId}`} className="sr-only">
                    {t("budgetFor", { category: label })}
                  </label>
                  <Input
                    id={`budget-${row.categoryId}`}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    className="text-right tabular-nums"
                    value={values[row.categoryId] ?? ""}
                    aria-invalid={invalid.has(row.categoryId) ? true : undefined}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, [row.categoryId]: event.target.value }))
                    }
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </section>
      <section className="card flex flex-wrap items-center gap-4 p-5">
        <p className="flex-1 text-sm text-ink-soft">
          {t("totals", {
            budget: formatMoney(format, total, currency),
            spent: formatMoney(format, spent, currency),
          })}
        </p>
        {canEdit ? (
          <Button onClick={save} disabled={pending || !dirty || invalid.size > 0}>
            {t("save", { year })}
          </Button>
        ) : null}
      </section>
    </div>
  );
}
