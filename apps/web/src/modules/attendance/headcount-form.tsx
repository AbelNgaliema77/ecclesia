"use client";

import { MAX_HEADCOUNT } from "@ecclesia/domain/attendance";
import { Minus, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { saveHeadcountAction } from "./actions";

type HeadcountFormProps = {
  serviceId: string;
  categories: readonly { id: string; label: string; color: string }[];
  initial: Readonly<Record<string, number>>;
  disabled: boolean;
};

const clamp = (value: number) => Math.min(MAX_HEADCOUNT, Math.max(0, Math.trunc(value)));

export function HeadcountForm({ serviceId, categories, initial, disabled }: HeadcountFormProps) {
  const t = useTranslations("attendance");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c.id, initial[c.id] ?? 0])),
  );
  const [state, action, pending] = useActionState(saveHeadcountAction, idleState);
  const { formError } = useActionMessages(state);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const change = (id: string, next: number) =>
    setCounts((current) => ({ ...current, [id]: clamp(next) }));

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="serviceId" value={serviceId} />
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      {state.status === "success" ? <FormAlert tone="success" message={t("saved")} /> : null}

      <fieldset
        disabled={disabled || pending}
        className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface"
      >
        {categories.map((category) => {
          const value = counts[category.id] ?? 0;
          return (
            <div key={category.id} className="flex items-center gap-4 px-4 py-4 sm:px-6">
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-sm"
                style={{ background: category.color }}
              />
              <label htmlFor={`count-${category.id}`} className="flex-1 text-base font-medium">
                {category.label}
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => change(category.id, value - 1)}
                  disabled={value === 0}
                  aria-label={t("decrease", { category: category.label })}
                  className="inline-flex size-12 items-center justify-center rounded-full border border-line-strong text-ink-soft transition-colors hover:border-ink-faint hover:text-ink active:bg-paper disabled:opacity-40"
                >
                  <Minus aria-hidden className="size-5" />
                </button>
                <input
                  id={`count-${category.id}`}
                  name={`count:${category.id}`}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={String(value)}
                  onChange={(e) =>
                    change(category.id, Number(e.target.value.replace(/\D/g, "") || 0))
                  }
                  onFocus={(e) => e.target.select()}
                  className="h-12 w-20 rounded-control border border-line-strong bg-surface text-center font-display text-2xl font-medium focus:border-sanctuary-500 focus:outline-none focus:ring-2 focus:ring-sanctuary-100"
                />
                <button
                  type="button"
                  onClick={() => change(category.id, value + 1)}
                  aria-label={t("increase", { category: category.label })}
                  className="inline-flex size-12 items-center justify-center rounded-full bg-sanctuary-700 text-white transition-colors hover:bg-sanctuary-800 active:bg-sanctuary-900"
                >
                  <Plus aria-hidden className="size-5" />
                </button>
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-paper/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <p className="flex items-baseline gap-2">
          <span className="text-sm text-ink-soft">{t("total")}</span>
          <span className="font-display text-3xl font-medium" aria-live="polite">
            {format.number(total)}
          </span>
        </p>
        {disabled ? null : (
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? tc("saving") : t("save")}
          </Button>
        )}
      </div>
    </form>
  );
}
