import { can } from "@ecclesia/domain/access";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GeneralSettingsForm } from "@/modules/settings/general-form";
import { loadGeneralSettings } from "@/modules/settings/queries";
import { SettingsSection } from "@/modules/settings/section";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Settings" };

export default async function GeneralSettingsPage() {
  const context = await getChurchContext();
  if (!can(context.actor, "settings.manage")) redirect("/settings/members");
  const [{ church, readOnly }, t] = await Promise.all([
    loadGeneralSettings(),
    getTranslations("settings.general"),
  ]);
  if (!church) notFound();
  return (
    <SettingsSection title={t("title")} lead={t("lead")}>
      <GeneralSettingsForm
        disabled={readOnly}
        timeZones={Array.from(
          new Set([church.timezone, ...Intl.supportedValuesOf("timeZone")]),
        ).sort()}
        initial={{
          name: church.name,
          defaultLocale: church.defaultLocale,
          timezone: church.timezone,
          currency: church.currency,
        }}
      />
    </SettingsSection>
  );
}
