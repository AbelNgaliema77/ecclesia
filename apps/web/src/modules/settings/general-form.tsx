"use client";

import { CURRENCIES } from "@ecclesia/domain/settings";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { updateChurchSettingsAction } from "./actions";

type GeneralFormProps = {
  initial: { name: string; defaultLocale: "en" | "fr"; timezone: string; currency: string };
  timeZones: readonly string[];
  disabled: boolean;
};

export function GeneralSettingsForm({ initial, timeZones, disabled }: GeneralFormProps) {
  const t = useTranslations("settings.general");
  const tc = useTranslations("common");
  const router = useRouter();
  const [state, action, pending] = useActionState(updateChurchSettingsAction, idleState);
  const { fieldError, formError, invalid } = useActionMessages(state);

  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(t("saved"));
    router.refresh();
  }, [state, t, router]);

  return (
    <form action={action} className="card flex flex-col gap-5 p-5 sm:p-6">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <fieldset disabled={disabled || pending} className="grid gap-5 sm:grid-cols-2">
        <Field
          id="church-name"
          label={t("name")}
          error={fieldError("name")}
          className="sm:col-span-2"
        >
          <Input
            id="church-name"
            name="name"
            defaultValue={initial.name}
            required
            maxLength={120}
            aria-invalid={invalid("name")}
          />
        </Field>
        <Field id="church-locale" label={t("defaultLocale")} hint={t("defaultLocaleHint")}>
          <Select id="church-locale" name="defaultLocale" defaultValue={initial.defaultLocale}>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </Select>
        </Field>
        <Field id="church-currency" label={t("currency")}>
          <Select id="church-currency" name="currency" defaultValue={initial.currency}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="church-timezone"
          label={t("timezone")}
          error={fieldError("timezone")}
          className="sm:col-span-2"
        >
          <Select id="church-timezone" name="timezone" defaultValue={initial.timezone}>
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>
      {disabled ? null : (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? tc("saving") : t("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
