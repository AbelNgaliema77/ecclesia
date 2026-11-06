"use client";

import { MAX_HEADCOUNT } from "@ecclesia/domain/attendance";
import { Minus, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
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
  const [bump, setBump] = useState<Record<string, number>>({});
  const [state, action, pending] = useActionState(saveHeadcountAction, idleState);
  const { formError } = useActionMessages(state);
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  useEffect(() => {
    if (state.status === "success") toast.success(t("saved"));
  }, [state, t]);

  const change = (id: string, next: number) =>
    setCounts((current) => ({ ...current, [id]: clamp(next) }));

  const step = (id: string, next: number) => {
    change(id, next);
    setBump((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
    if ("vibrate" in navigator) navigator.vibrate(8);
  };

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="serviceId" value={serviceId} />
      {formError ? <FormAlert tone="error" message={formError} /> : null}

      <fieldset disabled={disabled || pending} className="grid gap-3 sm:grid-cols-2">
        {categories.map((category) => {
          const value = counts[category.id] ?? 0;
          return (
            <div key={category.id} className="card flex items-center gap-3 p-3 pl-4">
              <span
                aria-hidden
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ background: category.color }}
              />
              <label htmlFor={`count-${category.id}`} className="min-w-0 flex-1 font-semibold">
                {category.label}
              </label>
              <button
                type="button"
                onClick={() => step(category.id, value - 1)}
                disabled={value === 0}
                aria-label={t("decrease", { category: category.label })}
                className="inline-flex size-12 items-center justify-center rounded-full bg-muted text-ink-soft transition-transform active:scale-90 disabled:opacity-40"
              >
                <Minus aria-hidden className="size-5" />
              </button>
              <input
                key={bump[category.id] ?? 0}
                id={`count-${category.id}`}
                name={`count:${category.id}`}
                inputMode="numeric"
                pattern="[0-9]*"
                value={String(value)}
                onChange={(e) =>
                  change(category.id, Number(e.target.value.replace(/\D/g, "") || 0))
                }
                onFocus={(e) => e.target.select()}
                className="count-pop h-12 w-16 rounded-control bg-transparent text-center font-display text-[1.75rem] font-bold focus:bg-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => step(category.id, value + 1)}
                aria-label={t("increase", { category: category.label })}
                className="inline-flex size-12 items-center justify-center rounded-full bg-brand text-brand-ink shadow-[0_6px_16px_-6px_rgb(15_107_71/0.6)] transition-transform active:scale-90"
              >
                <Plus aria-hidden className="size-5" />
              </button>
            </div>
          );
        })}
      </fieldset>

      <div className="sticky bottom-28 z-10 lg:bottom-4">
        <div className="hero flex items-center justify-between gap-4 rounded-hero p-3 pl-6 shadow-pop">
          <p className="flex items-baseline gap-2.5">
            <span className="text-sm font-semibold text-hero-ink-soft">{t("total")}</span>
            <span
              key={total}
              className="count-pop font-display text-4xl font-bold"
              aria-live="polite"
            >
              {format.number(total)}
            </span>
          </p>
          {disabled ? null : (
            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="bg-white text-[#0a3d2b] shadow-none hover:bg-white/90"
            >
              {pending ? tc("saving") : t("save")}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
