import { can } from "@ecclesia/domain/access";
import { DEFAULT_BRAND_THEME } from "@ecclesia/domain/settings";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LogoForm, ThemeForm } from "@/modules/settings/branding-forms";
import { SettingsSection } from "@/modules/settings/section";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingSettingsPage() {
  const context = await getChurchContext();
  if (!can(context.actor, "settings.manage")) notFound();
  const t = await getTranslations("settings.branding");
  const { branding, churchName } = context.membership;
  const readOnly = context.accessLevel !== "full";
  return (
    <div className="flex flex-col gap-10">
      <SettingsSection title={t("logoTitle")} lead={t("logoLead")}>
        <LogoForm churchName={churchName} logoVersion={branding.logoVersion} disabled={readOnly} />
      </SettingsSection>
      <SettingsSection title={t("themeTitle")} lead={t("themeLead")}>
        <ThemeForm current={branding.theme ?? DEFAULT_BRAND_THEME} disabled={readOnly} />
      </SettingsSection>
    </div>
  );
}
