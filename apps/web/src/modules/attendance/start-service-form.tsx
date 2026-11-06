"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useActionMessages } from "@/components/forms/use-field-error";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { startServiceAction } from "./actions";

type StartServiceFormProps = {
  serviceTypes: readonly { id: string; label: string }[];
  defaultServiceTypeId: string | null;
  today: string;
};

const glassControl =
  "h-12 w-full rounded-control border border-white/15 bg-white/10 px-3.5 text-[0.9375rem] font-medium text-hero-ink focus:border-white/40 focus:outline-none focus:ring-4 focus:ring-white/10 [&>option]:text-ink";

export function StartServiceForm({
  serviceTypes,
  defaultServiceTypeId,
  today,
}: StartServiceFormProps) {
  const t = useTranslations("attendance");
  const [state, action, pending] = useActionState(startServiceAction, idleState);
  const { formError } = useActionMessages(state);

  return (
    <form action={action} className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <fieldset
        disabled={pending}
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-hero-ink-soft">{t("serviceType")}</span>
          <select
            name="serviceTypeId"
            defaultValue={defaultServiceTypeId ?? undefined}
            required
            className={glassControl}
          >
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-hero-ink-soft">{t("date")}</span>
          <input
            name="date"
            type="date"
            defaultValue={today}
            max={today}
            required
            className={cn(glassControl, "[color-scheme:dark]")}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-control bg-white px-6 font-semibold text-[#0a3d2b] shadow-pop transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {t("start")}
        </button>
      </fieldset>
    </form>
  );
}
