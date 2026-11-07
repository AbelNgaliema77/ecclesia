"use client";

import { Lock, LockOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Textarea } from "@/components/ui/field";
import { setMonthClosedAction } from "./ledger-actions";

export function CloseMonthButton({ month, label }: { month: string; label: string }) {
  const t = useTranslations("finance.reports");
  return (
    <ConfirmAction
      action={setMonthClosedAction}
      hidden={{ month, close: "true" }}
      title={t("closeTitle", { month: label })}
      description={t("closeLead")}
      confirmLabel={t("close")}
      successMessage={t("closed")}
      trigger={(open) => (
        <Button variant="secondary" size="sm" onClick={open}>
          <Lock aria-hidden className="size-4" />
          {t("close")}
        </Button>
      )}
    />
  );
}

export function ReopenMonthButton({ month, label }: { month: string; label: string }) {
  const t = useTranslations("finance.reports");
  return (
    <ActionDialog
      action={setMonthClosedAction}
      hidden={{ month, close: "false" }}
      title={t("reopenTitle", { month: label })}
      description={t("reopenLead")}
      submitLabel={t("reopen")}
      submitVariant="danger"
      successMessage={t("reopened")}
      trigger={(open) => (
        <Button variant="ghost" size="sm" onClick={open}>
          <LockOpen aria-hidden className="size-4" />
          {t("reopen")}
        </Button>
      )}
    >
      {({ fieldError, invalid }) => (
        <Field id={`reopen-${month}`} label={t("reopenReason")} error={fieldError("reason")}>
          <Textarea
            id={`reopen-${month}`}
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
