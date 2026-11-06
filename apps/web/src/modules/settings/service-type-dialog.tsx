"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LocalizedNameFields } from "@/components/forms/localized-name-fields";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { WEEKDAYS, weekdayName } from "@/lib/weekdays";
import { saveServiceTypeAction } from "./actions";

type ServiceTypeDialogProps = {
  trigger: (open: () => void) => ReactNode;
  initial?: {
    id: string;
    name: { en: string; fr: string };
    dayOfWeek: number | null;
    startsAt: string | null;
  };
};

export function ServiceTypeDialog({ trigger, initial }: ServiceTypeDialogProps) {
  const t = useTranslations("settings.services");
  const tr = useTranslations("settings.roles");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <ActionDialog
      action={saveServiceTypeAction}
      hidden={initial ? { id: initial.id } : {}}
      trigger={trigger}
      title={initial ? t("editTitle", { name: initial.name.en }) : t("addTitle")}
      submitLabel={t("save")}
      successMessage={t("saved")}
    >
      {({ fieldError }) => (
        <>
          <LocalizedNameFields
            name="name"
            labels={{ en: tr("nameEn"), fr: tr("nameFr"), optional: tc("optional") }}
            {...(initial ? { defaultValue: initial.name } : {})}
            error={fieldError("name.en")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="service-day" label={t("day")} error={fieldError("dayOfWeek")}>
              <Select
                id="service-day"
                name="dayOfWeek"
                defaultValue={initial?.dayOfWeek?.toString() ?? ""}
              >
                <option value="">{t("anyDay")}</option>
                {WEEKDAYS.map((day) => (
                  <option key={day} value={day}>
                    {weekdayName(day, locale)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="service-time" label={t("time")} error={fieldError("startsAt")}>
              <Input
                id="service-time"
                name="startsAt"
                type="time"
                defaultValue={initial?.startsAt?.slice(0, 5) ?? ""}
              />
            </Field>
          </div>
        </>
      )}
    </ActionDialog>
  );
}
