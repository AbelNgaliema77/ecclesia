"use client";

import { Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { LocalizedNameFields } from "@/components/forms/localized-name-fields";
import { useActionMessages } from "@/components/forms/use-field-error";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Switch } from "@/components/ui/switch";
import { localized } from "@/i18n/config";
import { type ActionState, idleState } from "@/lib/action-state";
import { useHydrated } from "@/lib/use-hydrated";
import { centsToInput } from "./money";
import {
  saveCategoryAction,
  saveCertificateDetailsAction,
  saveFinanceControlsAction,
  saveFundAction,
} from "./settings-actions";

type Named = { id: string; name: { en: string; fr: string } };
type Fund = Named & { code: string; taxDeductible: boolean; isActive: boolean };
type Category = Named & { isActive: boolean };
type Settings = {
  defaultFundId: string | null;
  financeTeamId: string | null;
  secondApprovalAboveCents: number | null;
  requireTwoFactor: boolean;
  legalName: string | null;
  pboNumber: string | null;
  address: string | null;
  signatoryName: string | null;
};

function useSaved(state: ActionState<null>, message: string) {
  const router = useRouter();
  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(message);
    router.refresh();
  }, [state, message, router]);
}

export function ControlsForm({
  settings,
  funds,
  teams,
  disabled,
}: {
  settings: Settings;
  funds: readonly Fund[];
  teams: readonly Named[];
  disabled: boolean;
}) {
  const t = useTranslations("finance.settings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(saveFinanceControlsAction, idleState);
  const { fieldError, formError, invalid } = useActionMessages(state);
  useSaved(state, t("saved"));
  return (
    <form action={action} className="card flex flex-col gap-5 p-5 sm:p-6">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <fieldset disabled={disabled || pending} className="grid gap-4 sm:grid-cols-2">
        <Field
          id="second-approval"
          label={t("secondApproval")}
          hint={t("secondApprovalHint")}
          optionalLabel={tc("optional")}
          error={fieldError("secondApprovalAbove")}
        >
          <Input
            id="second-approval"
            name="secondApprovalAbove"
            inputMode="decimal"
            defaultValue={
              settings.secondApprovalAboveCents
                ? centsToInput(settings.secondApprovalAboveCents)
                : ""
            }
            aria-invalid={invalid("secondApprovalAbove")}
          />
        </Field>
        <Field id="finance-team" label={t("financeTeam")} hint={t("financeTeamHint")}>
          <Select
            id="finance-team"
            name="financeTeamId"
            defaultValue={settings.financeTeamId ?? ""}
          >
            <option value="">{t("noFinanceTeam")}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {localized(team.name, locale)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="default-fund" label={t("defaultFund")} hint={t("defaultFundHint")}>
          <Select
            id="default-fund"
            name="defaultFundId"
            defaultValue={settings.defaultFundId ?? ""}
          >
            <option value="">{t("noDefaultFund")}</option>
            {funds
              .filter((fund) => fund.isActive)
              .map((fund) => (
                <option key={fund.id} value={fund.id}>
                  {localized(fund.name, locale)}
                </option>
              ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Switch
            name="requireTwoFactor"
            label={t("requireTwoFactor")}
            hint={t("requireTwoFactorHint")}
            defaultChecked={settings.requireTwoFactor}
          />
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || pending || !hydrated}>
          {pending ? tc("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

export function CertificateDetailsForm({
  settings,
  disabled,
}: {
  settings: Settings;
  disabled: boolean;
}) {
  const t = useTranslations("finance.settings");
  const tc = useTranslations("common");
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(saveCertificateDetailsAction, idleState);
  const { formError } = useActionMessages(state);
  useSaved(state, t("saved"));
  return (
    <form action={action} className="card flex flex-col gap-5 p-5 sm:p-6">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <fieldset disabled={disabled || pending} className="grid gap-4 sm:grid-cols-2">
        <Field id="legal-name" label={t("legalName")} hint={t("legalNameHint")}>
          <Input
            id="legal-name"
            name="legalName"
            defaultValue={settings.legalName ?? ""}
            maxLength={120}
          />
        </Field>
        <Field id="pbo-number" label={t("pboNumber")} hint={t("pboNumberHint")}>
          <Input
            id="pbo-number"
            name="pboNumber"
            defaultValue={settings.pboNumber ?? ""}
            maxLength={30}
          />
        </Field>
        <Field id="church-address" label={t("address")} className="sm:col-span-2">
          <Textarea
            id="church-address"
            name="address"
            defaultValue={settings.address ?? ""}
            maxLength={300}
            className="min-h-20"
          />
        </Field>
        <Field id="signatory" label={t("signatory")} hint={t("signatoryHint")}>
          <Input
            id="signatory"
            name="signatoryName"
            defaultValue={settings.signatoryName ?? ""}
            maxLength={120}
          />
        </Field>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || pending || !hydrated}>
          {pending ? tc("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}

export function FundList({ funds, disabled }: { funds: readonly Fund[]; disabled: boolean }) {
  const t = useTranslations("finance.settings");
  const locale = useLocale();
  return (
    <section className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {funds.map((fund) => (
          <li key={fund.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{localized(fund.name, locale)}</span>
              <span className="block text-xs text-ink-faint">{fund.code}</span>
            </span>
            {fund.taxDeductible ? <Badge tone="brand">{t("deductible")}</Badge> : null}
            {fund.isActive ? null : <Badge tone="muted">{t("inactive")}</Badge>}
            {disabled ? null : <FundDialog fund={fund} />}
          </li>
        ))}
      </ul>
      {disabled ? null : (
        <div className="border-t border-line px-5 py-3">
          <FundDialog />
        </div>
      )}
    </section>
  );
}

function FundDialog({ fund }: { fund?: Fund }) {
  const t = useTranslations("finance.settings");
  const tr = useTranslations("settings.roles");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <ActionDialog
      action={saveFundAction}
      title={fund ? t("editFund") : t("addFund")}
      submitLabel={t("saveFund")}
      successMessage={t("fundSaved")}
      {...(fund ? { hidden: { id: fund.id } } : {})}
      trigger={(open) =>
        fund ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={open}
            aria-label={t("editFundLabel", { name: localized(fund.name, locale) })}
          >
            <Pencil aria-hidden className="size-4" />
          </Button>
        ) : (
          <Button variant="soft" size="sm" onClick={open}>
            <Plus aria-hidden className="size-4" />
            {t("addFund")}
          </Button>
        )
      }
    >
      {({ fieldError, invalid }) => (
        <>
          <LocalizedNameFields
            name="name"
            labels={{ en: tr("nameEn"), fr: tr("nameFr"), optional: tc("optional") }}
            {...(fund ? { defaultValue: fund.name } : {})}
            {...(fieldError("name.en") ? { error: fieldError("name.en") } : {})}
          />
          <Field id="fund-code" label={t("code")} hint={t("codeHint")} error={fieldError("code")}>
            <Input
              id="fund-code"
              name="code"
              defaultValue={fund?.code ?? ""}
              required
              maxLength={16}
              className="uppercase"
              aria-invalid={invalid("code")}
            />
          </Field>
          <Switch
            name="taxDeductible"
            label={t("deductibleLabel")}
            hint={t("deductibleHint")}
            defaultChecked={fund?.taxDeductible ?? true}
          />
          {fund ? (
            <Switch
              name="isActive"
              label={t("activeLabel")}
              hint={t("fundActiveHint")}
              defaultChecked={fund.isActive}
            />
          ) : null}
        </>
      )}
    </ActionDialog>
  );
}

export function CategoryList({
  categories,
  disabled,
}: {
  categories: readonly Category[];
  disabled: boolean;
}) {
  const t = useTranslations("finance.settings");
  const locale = useLocale();
  return (
    <section className="card overflow-hidden">
      <ul className="divide-y divide-line">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center gap-3 px-5 py-3.5">
            <span className="min-w-0 flex-1 font-semibold">{localized(category.name, locale)}</span>
            {category.isActive ? null : <Badge tone="muted">{t("inactive")}</Badge>}
            {disabled ? null : <CategoryDialog category={category} />}
          </li>
        ))}
      </ul>
      {disabled ? null : (
        <div className="border-t border-line px-5 py-3">
          <CategoryDialog />
        </div>
      )}
    </section>
  );
}

function CategoryDialog({ category }: { category?: Category }) {
  const t = useTranslations("finance.settings");
  const tr = useTranslations("settings.roles");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <ActionDialog
      action={saveCategoryAction}
      title={category ? t("editCategory") : t("addCategory")}
      submitLabel={t("saveCategory")}
      successMessage={t("categorySaved")}
      {...(category ? { hidden: { id: category.id } } : {})}
      trigger={(open) =>
        category ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={open}
            aria-label={t("editCategoryLabel", { name: localized(category.name, locale) })}
          >
            <Pencil aria-hidden className="size-4" />
          </Button>
        ) : (
          <Button variant="soft" size="sm" onClick={open}>
            <Plus aria-hidden className="size-4" />
            {t("addCategory")}
          </Button>
        )
      }
    >
      {({ fieldError }) => (
        <>
          <LocalizedNameFields
            name="name"
            labels={{ en: tr("nameEn"), fr: tr("nameFr"), optional: tc("optional") }}
            {...(category ? { defaultValue: category.name } : {})}
            {...(fieldError("name.en") ? { error: fieldError("name.en") } : {})}
          />
          {category ? (
            <Switch
              name="isActive"
              label={t("activeLabel")}
              hint={t("categoryActiveHint")}
              defaultChecked={category.isActive}
            />
          ) : null}
        </>
      )}
    </ActionDialog>
  );
}
