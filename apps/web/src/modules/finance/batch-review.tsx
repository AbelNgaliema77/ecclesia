"use client";

import { CheckCheck, Trash2, Undo2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Textarea } from "@/components/ui/field";
import { deleteBatchAction, returnBatchAction, verifyBatchAction } from "./batch-actions";

export function VerifyBatchButtons({ id, total }: { id: string; total: string }) {
  const t = useTranslations("finance.counts");
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction
        action={verifyBatchAction}
        hidden={{ id }}
        title={t("verifyTitle")}
        description={t("verifyLead", { total })}
        confirmLabel={t("verify")}
        successMessage={t("verified")}
        trigger={(open) => (
          <Button onClick={open}>
            <CheckCheck aria-hidden className="size-4" />
            {t("verify")}
          </Button>
        )}
      />
      <ActionDialog
        action={returnBatchAction}
        hidden={{ id }}
        title={t("returnTitle")}
        description={t("returnLead")}
        submitLabel={t("return")}
        successMessage={t("returned")}
        trigger={(open) => (
          <Button variant="secondary" onClick={open}>
            <Undo2 aria-hidden className="size-4" />
            {t("return")}
          </Button>
        )}
      >
        {({ fieldError, invalid }) => (
          <Field id="return-reason" label={t("returnReason")} error={fieldError("reason")}>
            <Textarea
              id="return-reason"
              name="reason"
              required
              minLength={3}
              maxLength={300}
              aria-invalid={invalid("reason")}
            />
          </Field>
        )}
      </ActionDialog>
    </div>
  );
}

export function DeleteBatchButton({ id }: { id: string }) {
  const t = useTranslations("finance.counts");
  return (
    <ConfirmAction
      action={deleteBatchAction}
      hidden={{ id }}
      title={t("deleteTitle")}
      description={t("deleteLead")}
      confirmLabel={t("delete")}
      successMessage={t("deleted")}
      trigger={(open) => (
        <Button variant="ghost" size="sm" onClick={open}>
          <Trash2 aria-hidden className="size-4" />
          {t("delete")}
        </Button>
      )}
    />
  );
}
