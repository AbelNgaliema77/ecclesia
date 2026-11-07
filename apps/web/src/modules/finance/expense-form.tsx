"use client";

import { MAX_ATTACHMENTS_PER_EXPENSE, parseAmount } from "@ecclesia/domain/finance";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState, useTransition } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { localized } from "@/i18n/config";
import { type ActionState, idleState } from "@/lib/action-state";
import { useHydrated } from "@/lib/use-hydrated";
import { AttachmentPicker, type PickedFile } from "./attachment-picker";
import { createExpenseAction, uploadAttachmentAction } from "./expense-actions";
import { formatMoney } from "./money";

type Named = { id: string; name: { en: string; fr: string } };

type ExpenseFormProps = {
  currency: string;
  funds: readonly Named[];
  categories: readonly Named[];
  teams: readonly Named[];
  teamRequired: boolean;
  defaultFundId: string | null;
  secondApprovalAboveCents: number | null;
};

export function ExpenseForm(props: ExpenseFormProps) {
  const t = useTranslations("finance.expenses");
  const tc = useTranslations("common");
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const hydrated = useHydrated();
  const [state, setState] = useState<ActionState<{ id: string }>>(idleState);
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [kind, setKind] = useState<"receipt" | "quote">("quote");
  const [amount, setAmount] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { fieldError, formError, invalid } = useActionMessages(state);
  const cents = parseAmount(amount);
  const needsTwo =
    props.secondApprovalAboveCents !== null &&
    cents !== null &&
    cents > props.secondApprovalAboveCents;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      setProgress(null);
      const result = await createExpenseAction(idleState, data);
      setState(result);
      if (result.status !== "success") return;
      let failed = 0;
      for (const [index, picked] of files.entries()) {
        setProgress(t("uploading", { current: index + 1, total: files.length }));
        const upload = new FormData();
        upload.set("expenseId", result.data.id);
        upload.set("kind", kind);
        upload.set("file", picked.file);
        try {
          const uploaded = await uploadAttachmentAction(upload);
          if (uploaded.status !== "success") failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (failed > 0) toast.error(t("uploadFailed", { count: failed }));
      toast.success(t("submitted"));
      router.push(`/finance/expenses/${result.data.id}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <section className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field
          id="expense-title"
          label={t("fields.title")}
          hint={t("fields.titleHint")}
          error={fieldError("title")}
          className="sm:col-span-2"
        >
          <Input
            id="expense-title"
            name="title"
            required
            maxLength={120}
            aria-invalid={invalid("title")}
          />
        </Field>
        <Field id="expense-amount" label={t("fields.amount")} error={fieldError("amount")}>
          <Input
            id="expense-amount"
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={invalid("amount")}
          />
        </Field>
        <Field
          id="expense-payee"
          label={t("fields.payee")}
          hint={t("fields.payeeHint")}
          error={fieldError("payee")}
        >
          <Input
            id="expense-payee"
            name="payee"
            required
            maxLength={120}
            aria-invalid={invalid("payee")}
          />
        </Field>
        <Field id="expense-category" label={t("fields.category")} error={fieldError("categoryId")}>
          <Select id="expense-category" name="categoryId" required defaultValue="">
            <option value="" disabled>
              {t("fields.choose")}
            </option>
            {props.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {localized(category.name, locale)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="expense-fund"
          label={t("fields.fund")}
          hint={t("fields.fundHint")}
          error={fieldError("fundId")}
        >
          <Select
            id="expense-fund"
            name="fundId"
            required
            defaultValue={props.defaultFundId ?? props.funds[0]?.id ?? ""}
          >
            {props.funds.map((fund) => (
              <option key={fund.id} value={fund.id}>
                {localized(fund.name, locale)}
              </option>
            ))}
          </Select>
        </Field>
        {props.teams.length > 0 ? (
          <Field
            id="expense-team"
            label={t("fields.team")}
            optionalLabel={props.teamRequired ? undefined : tc("optional")}
            error={fieldError("teamId")}
          >
            <Select
              id="expense-team"
              name="teamId"
              defaultValue={props.teamRequired ? (props.teams[0]?.id ?? "") : ""}
            >
              {props.teamRequired ? null : <option value="">{t("fields.noTeam")}</option>}
              {props.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {localized(team.name, locale)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field
          id="expense-needed"
          label={t("fields.neededBy")}
          optionalLabel={tc("optional")}
          error={fieldError("neededBy")}
        >
          <Input id="expense-needed" name="neededBy" type="date" />
        </Field>
        <Field
          id="expense-description"
          label={t("fields.description")}
          optionalLabel={tc("optional")}
          className="sm:col-span-2"
        >
          <Textarea id="expense-description" name="description" maxLength={2000} />
        </Field>
      </section>

      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-bold">{t("attachTitle")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("attachLead")}</p>
        </div>
        <fieldset className="flex flex-wrap gap-4 text-sm">
          <legend className="sr-only">{t("attachKind")}</legend>
          {(["quote", "receipt"] as const).map((option) => (
            <label key={option} className="flex items-center gap-2">
              <input
                type="radio"
                name="attachmentKind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="size-4 accent-[var(--brand)]"
              />
              {t(`kinds.${option}`)}
            </label>
          ))}
        </fieldset>
        <AttachmentPicker
          files={files}
          onChange={setFiles}
          max={MAX_ATTACHMENTS_PER_EXPENSE}
          disabled={pending}
        />
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-sm text-ink-soft sm:mr-auto" aria-live="polite">
          {progress ??
            (cents
              ? needsTwo
                ? t("needsTwo", { amount: formatMoney(format, cents, props.currency) })
                : t("needsOne", { amount: formatMoney(format, cents, props.currency) })
              : null)}
        </p>
        <Button type="submit" size="lg" disabled={pending || !hydrated}>
          <Send aria-hidden className="size-4" />
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
