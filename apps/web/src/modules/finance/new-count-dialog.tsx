"use client";

import { Plus } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { localized } from "@/i18n/config";
import { createBatchAction } from "./batch-actions";

type ServiceOption = { id: string; occursAt: Date; name: { en: string; fr: string } };

export function NewCountDialog({
  today,
  services,
  timeZone,
}: {
  today: string;
  services: readonly ServiceOption[];
  timeZone: string;
}) {
  const t = useTranslations("finance.counts");
  const tc = useTranslations("common");
  const format = useFormatter();
  const locale = useLocale();
  return (
    <ActionDialog
      action={createBatchAction}
      title={t("newTitle")}
      description={t("newLead")}
      submitLabel={t("start")}
      successMessage={t("started")}
      trigger={(open) => (
        <Button onClick={open}>
          <Plus aria-hidden className="size-4" />
          {t("new")}
        </Button>
      )}
    >
      {({ fieldError, invalid }) => (
        <>
          <Field id="count-date" label={t("receivedOn")} error={fieldError("receivedOn")}>
            <Input
              id="count-date"
              name="receivedOn"
              type="date"
              max={today}
              defaultValue={today}
              required
              aria-invalid={invalid("receivedOn")}
            />
          </Field>
          <Field id="count-service" label={t("service")} optionalLabel={tc("optional")}>
            <Select id="count-service" name="serviceId" defaultValue="">
              <option value="">{t("noService")}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {localized(service.name, locale)} ·{" "}
                  {format.dateTime(new Date(service.occursAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone,
                  })}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="count-notes" label={t("notes")} optionalLabel={tc("optional")}>
            <Textarea id="count-notes" name="notes" maxLength={500} className="min-h-20" />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}
