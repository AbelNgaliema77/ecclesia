import { can } from "@ecclesia/domain/access";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsTabs } from "@/modules/settings/settings-tabs";
import { getChurchContext } from "@/server/context";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const context = await getChurchContext();
  const canSettings = can(context.actor, "settings.manage");
  const canUsers = can(context.actor, "users.manage");
  if (!canSettings && !canUsers) notFound();
  const t = await getTranslations("settings");

  const tabs: { href: Route; label: string }[] = [
    ...(canSettings ? [{ href: "/settings" as Route, label: t("tabs.general") }] : []),
    ...(canUsers
      ? [
          { href: "/settings/members" as Route, label: t("tabs.members") },
          { href: "/settings/roles" as Route, label: t("tabs.roles") },
        ]
      : []),
    ...(canSettings
      ? [
          { href: "/settings/services" as Route, label: t("tabs.services") },
          { href: "/settings/categories" as Route, label: t("tabs.categories") },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} lead={t("lead", { church: context.membership.churchName })} />
      <SettingsTabs tabs={tabs} label={t("title")} />
      <div>{children}</div>
    </div>
  );
}
