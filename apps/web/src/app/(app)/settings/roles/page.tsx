import { ChevronRight, Plus, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { localized } from "@/i18n/config";
import { loadRoles } from "@/modules/roles/queries";
import { SettingsSection } from "@/modules/settings/section";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const [data, context, t, locale] = await Promise.all([
    loadRoles(),
    getChurchContext(),
    getTranslations("settings.roles"),
    getLocale(),
  ]);
  return (
    <SettingsSection
      title={t("title")}
      lead={t("lead", { church: context.membership.churchName })}
      actions={
        data.readOnly ? null : (
          <Link href="/settings/roles/new" className={buttonClasses("primary")}>
            <Plus aria-hidden className="size-4" />
            {t("create")}
          </Link>
        )
      }
    >
      <ul className="grid gap-3 md:grid-cols-2">
        {data.roles.map((role) => (
          <li key={role.id}>
            <Link
              href={`/settings/roles/${role.id}`}
              className="card group flex items-center gap-4 p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
            >
              <span className="icon-tile size-11">
                <ShieldCheck aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold">{localized(role.name, locale)}</span>
                  <Badge tone={role.isSystem ? "neutral" : "gold"}>
                    {role.isSystem ? t("builtIn") : t("custom")}
                  </Badge>
                </span>
                <span className="mt-0.5 block text-sm text-ink-faint">
                  {t("members", { count: role.members })},{" "}
                  {t("permissions", { count: role.grants.length })}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-4 text-ink-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
