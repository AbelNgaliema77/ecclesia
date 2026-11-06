"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { startServiceAction } from "./actions";

type StartServiceFormProps = {
  serviceTypes: readonly { id: string; label: string }[];
  defaultServiceTypeId: string | null;
  today: string;
  disabled: boolean;
};

export function StartServiceForm({
  serviceTypes,
  defaultServiceTypeId,
  today,
  disabled,
}: StartServiceFormProps) {
  const t = useTranslations("attendance");
  const [state, action, pending] = useActionState(startServiceAction, idleState);
  const { formError, fieldError } = useActionMessages(state);

  return (
    <form action={action} className="flex flex-col gap-4">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <fieldset
        disabled={disabled || pending}
        className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end"
      >
        <Field id="serviceTypeId" label={t("serviceType")} error={fieldError("serviceTypeId")}>
          <Select
            id="serviceTypeId"
            name="serviceTypeId"
            defaultValue={defaultServiceTypeId ?? undefined}
            required
          >
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="date" label={t("date")} error={fieldError("date")}>
          <Input id="date" name="date" type="date" defaultValue={today} max={today} required />
        </Field>
        <Button type="submit" disabled={pending}>
          {t("start")}
        </Button>
      </fieldset>
    </form>
  );
}
