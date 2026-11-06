import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { loadServiceTypes } from "@/modules/settings/queries";
import { SettingsSection } from "@/modules/settings/section";
import { AddServiceTypeButton, ServiceTypeList } from "@/modules/settings/service-type-list";

export const metadata: Metadata = { title: "Service times" };

export default async function ServiceTypesPage() {
  const [data, t] = await Promise.all([loadServiceTypes(), getTranslations("settings.services")]);
  return (
    <SettingsSection
      title={t("title")}
      lead={t("lead")}
      actions={data.readOnly ? null : <AddServiceTypeButton />}
    >
      <ServiceTypeList
        readOnly={data.readOnly}
        items={data.serviceTypes.map((s) => ({
          id: s.id,
          name: s.name,
          dayOfWeek: s.dayOfWeek,
          startsAt: s.startsAt,
          isActive: s.isActive,
        }))}
      />
    </SettingsSection>
  );
}
