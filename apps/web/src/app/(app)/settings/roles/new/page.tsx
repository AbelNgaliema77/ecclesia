import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { localized } from "@/i18n/config";
import { loadRoles } from "@/modules/roles/queries";
import { RoleEditor } from "@/modules/roles/role-editor";
import { StartFrom } from "@/modules/roles/start-from";

export const metadata: Metadata = { title: "Create a role" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function NewRolePage({ searchParams }: PageProps) {
  const [{ from }, data, t, locale] = await Promise.all([
    searchParams,
    loadRoles(),
    getTranslations("settings.roles"),
    getLocale(),
  ]);
  if (data.readOnly) notFound();
  const template = data.roles.find((r) => r.id === from) ?? null;
  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/settings/roles" label={t("back")} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-xl font-bold">{t("newTitle")}</h2>
        <StartFrom
          label={t("startFrom")}
          blankLabel={t("blank")}
          value={template?.id ?? ""}
          options={data.roles.map((r) => ({ id: r.id, label: localized(r.name, locale) }))}
        />
      </div>
      <RoleEditor
        key={template?.id ?? "blank"}
        id={null}
        name={null}
        grants={template?.grants ?? []}
        locked={false}
      />
    </div>
  );
}
