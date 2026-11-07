import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { loadFinanceSettings } from "@/modules/finance/queries";
import {
  CategoryList,
  CertificateDetailsForm,
  ControlsForm,
  FundList,
} from "@/modules/finance/settings-forms";
import { SettingsSection } from "@/modules/settings/section";

export const metadata: Metadata = { title: "Finance settings" };

export default async function FinanceSettingsPage() {
  const [data, t] = await Promise.all([loadFinanceSettings(), getTranslations("finance.settings")]);
  const disabled = !data.canWrite;
  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={t("title")} lead={t("lead")} />
      <SettingsSection title={t("controlsTitle")} lead={t("controlsLead")}>
        <ControlsForm
          settings={data.settings}
          funds={data.funds}
          teams={data.teams}
          disabled={disabled}
        />
      </SettingsSection>
      <SettingsSection title={t("fundsTitle")} lead={t("fundsLead")}>
        <FundList funds={data.funds} disabled={disabled} />
      </SettingsSection>
      <SettingsSection title={t("categoriesTitle")} lead={t("categoriesLead")}>
        <CategoryList categories={data.categories} disabled={disabled} />
      </SettingsSection>
      <SettingsSection title={t("certificatesTitle")} lead={t("certificatesLead")}>
        <CertificateDetailsForm settings={data.settings} disabled={disabled} />
      </SettingsSection>
    </div>
  );
}
