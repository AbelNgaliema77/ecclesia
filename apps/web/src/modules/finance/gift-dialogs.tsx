"use client";

import { GIVING_METHODS } from "@ecclesia/domain/finance";
import { Ban, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { localized } from "@/i18n/config";
import { recordGiftAction, voidGiftAction } from "./giving-actions";
import { PersonCombobox } from "./person-combobox";

type FundOption = { id: string; code: string; name: { en: string; fr: string }; isActive: boolean };

export function RecordGiftDialog({
  funds,
  today,
  defaultFundId,
}: {
  funds: readonly FundOption[];
  today: string;
  defaultFundId?: string | null;
}) {
  const t = useTranslations("finance.giving");
  const tm = useTranslations("finance.methods");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <ActionDialog
      action={recordGiftAction}
      title={t("recordTitle")}
      description={t("recordLead")}
      submitLabel={t("record")}
      successMessage={t("recorded")}
      size="lg"
      trigger={(open) => (
        <Button onClick={open}>
          <Plus aria-hidden className="size-4" />
          {t("record")}
        </Button>
      )}
    >
      {({ fieldError, invalid }) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="gift-amount" label={t("amount")} error={fieldError("amount")}>
            <Input
              id="gift-amount"
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              required
              aria-invalid={invalid("amount")}
            />
          </Field>
          <Field id="gift-date" label={t("receivedOn")} error={fieldError("receivedOn")}>
            <Input
              id="gift-date"
              name="receivedOn"
              type="date"
              max={today}
              defaultValue={today}
              required
              aria-invalid={invalid("receivedOn")}
            />
          </Field>
          <Field id="gift-fund" label={t("fund")} error={fieldError("fundId")}>
            <Select
              id="gift-fund"
              name="fundId"
              defaultValue={defaultFundId ?? funds[0]?.id}
              required
            >
              {funds
                .filter((fund) => fund.isActive)
                .map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {localized(fund.name, locale)}
                  </option>
                ))}
            </Select>
          </Field>
          <Field id="gift-method" label={t("method")} error={fieldError("method")}>
            <Select id="gift-method" name="method" defaultValue="eft" required>
              {GIVING_METHODS.map((method) => (
                <option key={method} value={method}>
                  {tm(method)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <PersonCombobox name="personId" label={`${t("giver")} (${tc("optional")})`} />
          </div>
          <Field
            id="gift-reference"
            label={t("reference")}
            optionalLabel={tc("optional")}
            className="sm:col-span-2"
          >
            <Input id="gift-reference" name="reference" maxLength={80} />
          </Field>
        </div>
      )}
    </ActionDialog>
  );
}

export function VoidGiftDialog({ id, summary }: { id: string; summary: string }) {
  const t = useTranslations("finance.giving");
  return (
    <ActionDialog
      action={voidGiftAction}
      title={t("voidTitle")}
      description={t("voidLead", { gift: summary })}
      submitLabel={t("void")}
      submitVariant="danger"
      successMessage={t("voided")}
      hidden={{ id }}
      trigger={(open) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={open}
          aria-label={t("voidLabel", { gift: summary })}
        >
          <Ban aria-hidden className="size-4" />
          <span className="hidden sm:inline">{t("void")}</span>
        </Button>
      )}
    >
      {({ fieldError, invalid }) => (
        <Field id={`void-reason-${id}`} label={t("voidReason")} error={fieldError("reason")}>
          <Textarea
            id={`void-reason-${id}`}
            name="reason"
            required
            minLength={3}
            maxLength={300}
            aria-invalid={invalid("reason")}
          />
        </Field>
      )}
    </ActionDialog>
  );
}
