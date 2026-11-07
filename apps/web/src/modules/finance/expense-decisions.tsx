"use client";

import { Banknote, Check, X, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Input, Textarea } from "@/components/ui/field";
import { cancelExpenseAction, decideExpenseAction, payExpenseAction } from "./expense-actions";

export function DecideButtons({ id, summary }: { id: string; summary: string }) {
  const t = useTranslations("finance.expenses");
  const tc = useTranslations("common");
  return (
    <div className="flex flex-wrap gap-2">
      <ActionDialog
        action={decideExpenseAction}
        hidden={{ id, decision: "approve" }}
        title={t("approveTitle")}
        description={t("approveLead", { summary })}
        submitLabel={t("approve")}
        successMessage={t("approved")}
        trigger={(open) => (
          <Button onClick={open}>
            <Check aria-hidden className="size-4" />
            {t("approve")}
          </Button>
        )}
      >
        {() => (
          <Field id="approve-note" label={t("note")} optionalLabel={tc("optional")}>
            <Textarea id="approve-note" name="note" maxLength={500} className="min-h-20" />
          </Field>
        )}
      </ActionDialog>
      <ActionDialog
        action={decideExpenseAction}
        hidden={{ id, decision: "reject" }}
        title={t("rejectTitle")}
        description={t("rejectLead", { summary })}
        submitLabel={t("reject")}
        submitVariant="danger"
        successMessage={t("rejected")}
        trigger={(open) => (
          <Button variant="secondary" onClick={open}>
            <X aria-hidden className="size-4" />
            {t("reject")}
          </Button>
        )}
      >
        {({ fieldError, invalid }) => (
          <Field id="reject-note" label={t("rejectReason")} error={fieldError("note")}>
            <Textarea
              id="reject-note"
              name="note"
              required
              minLength={3}
              maxLength={500}
              aria-invalid={invalid("note")}
            />
          </Field>
        )}
      </ActionDialog>
    </div>
  );
}

export function PayDialog({ id, summary, today }: { id: string; summary: string; today: string }) {
  const t = useTranslations("finance.expenses");
  const tc = useTranslations("common");
  return (
    <ActionDialog
      action={payExpenseAction}
      hidden={{ id }}
      title={t("payTitle")}
      description={t("payLead", { summary })}
      submitLabel={t("markPaid")}
      successMessage={t("paid")}
      trigger={(open) => (
        <Button onClick={open}>
          <Banknote aria-hidden className="size-4" />
          {t("markPaid")}
        </Button>
      )}
    >
      {({ fieldError, invalid }) => (
        <>
          <Field id="pay-date" label={t("paidOn")} error={fieldError("paidOn")}>
            <Input
              id="pay-date"
              name="paidOn"
              type="date"
              max={today}
              defaultValue={today}
              required
              aria-invalid={invalid("paidOn")}
            />
          </Field>
          <Field
            id="pay-reference"
            label={t("paymentReference")}
            hint={t("paymentReferenceHint")}
            error={fieldError("reference")}
          >
            <Input
              id="pay-reference"
              name="reference"
              required
              maxLength={80}
              aria-invalid={invalid("reference")}
            />
          </Field>
          <Field
            id="pay-proof"
            label={t("proof")}
            hint={t("proofHint")}
            optionalLabel={tc("optional")}
          >
            <input
              id="pay-proof"
              name="proof"
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="text-sm file:mr-3 file:h-9 file:rounded-control file:border-0 file:bg-brand-soft file:px-3 file:text-sm file:font-semibold file:text-brand-soft-ink"
            />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export function CancelExpenseButton({ id }: { id: string }) {
  const t = useTranslations("finance.expenses");
  return (
    <ConfirmAction
      action={cancelExpenseAction}
      hidden={{ id }}
      title={t("cancelTitle")}
      description={t("cancelLead")}
      confirmLabel={t("cancelRequest")}
      successMessage={t("cancelled")}
      trigger={(open) => (
        <Button variant="ghost" onClick={open}>
          <XCircle aria-hidden className="size-4" />
          {t("cancelRequest")}
        </Button>
      )}
    />
  );
}
