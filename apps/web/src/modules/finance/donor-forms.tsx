"use client";

import { FileCheck2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { useHydrated } from "@/lib/use-hydrated";
import { issueCertificatesAction } from "./certificate-actions";
import { saveDonorAction } from "./giving-actions";

type Profile = {
  givingNumber: string | null;
  taxNumber: string | null;
  address: string | null;
} | null;

export function DonorForm({ personId, profile }: { personId: string; profile: Profile }) {
  const t = useTranslations("finance.donors");
  const tc = useTranslations("common");
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(saveDonorAction, idleState);
  const { fieldError, formError, invalid } = useActionMessages(state);
  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(t("saved"));
    router.refresh();
  }, [state, t, router]);
  return (
    <form action={action} className="card flex flex-col gap-4 p-5 sm:p-6">
      <input type="hidden" name="personId" value={personId} />
      <h2 className="text-lg font-bold">{t("profileTitle")}</h2>
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="giving-number"
          label={t("givingNumber")}
          hint={t("givingNumberHint")}
          optionalLabel={tc("optional")}
          error={fieldError("givingNumber")}
        >
          <Input
            id="giving-number"
            name="givingNumber"
            defaultValue={profile?.givingNumber ?? ""}
            maxLength={20}
            aria-invalid={invalid("givingNumber")}
          />
        </Field>
        <Field
          id="tax-number"
          label={t("taxNumber")}
          hint={t("taxNumberHint")}
          optionalLabel={tc("optional")}
        >
          <Input
            id="tax-number"
            name="taxNumber"
            defaultValue={profile?.taxNumber ?? ""}
            maxLength={40}
            autoComplete="off"
          />
        </Field>
        <Field
          id="donor-address"
          label={t("address")}
          optionalLabel={tc("optional")}
          className="sm:col-span-2"
        >
          <Textarea
            id="donor-address"
            name="address"
            defaultValue={profile?.address ?? ""}
            maxLength={300}
            className="min-h-20"
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !hydrated}>
          {pending ? tc("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

export function IssueCertificatesButton({
  year,
  personId,
  label,
  variant = "primary",
}: {
  year: number;
  personId?: string;
  label: string;
  variant?: "primary" | "secondary" | "soft";
}) {
  const t = useTranslations("finance.certificates");
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(issueCertificatesAction, idleState);
  const { formError } = useActionMessages(state);
  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(t("issued", { count: state.data.issued }));
    router.refresh();
  }, [state, t, router]);
  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="year" value={year} />
      {personId ? <input type="hidden" name="personId" value={personId} /> : null}
      <Button type="submit" variant={variant} size="sm" disabled={pending || !hydrated}>
        <FileCheck2 aria-hidden className="size-4" />
        {label}
      </Button>
      {formError ? <p className="text-xs font-medium text-danger">{formError}</p> : null}
    </form>
  );
}
