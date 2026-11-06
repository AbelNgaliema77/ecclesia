import { Copy } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { localized } from "@/i18n/config";
import { DeleteRole } from "@/modules/roles/delete-role";
import { loadRole } from "@/modules/roles/queries";
import { RoleEditor } from "@/modules/roles/role-editor";

export const metadata: Metadata = { title: "Role" };

export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ role, members, readOnly }, t, locale] = await Promise.all([
    loadRole(id),
    getTranslations("settings.roles"),
    getLocale(),
  ]);
  const name = localized(role.name, locale);
  const locked = role.isSystem || readOnly;
  return (
    <div className="flex flex-col gap-5">
      <BackLink href="/settings/roles" label={t("back")} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">{name}</h2>
          <Badge tone={role.isSystem ? "neutral" : "gold"}>
            {role.isSystem ? t("builtIn") : t("custom")}
          </Badge>
          <span className="text-sm text-ink-faint">{t("members", { count: members })}</span>
        </div>
        {readOnly ? null : (
          <div className="flex gap-2">
            <Link
              href={`/settings/roles/new?from=${role.id}` as Route}
              className={buttonClasses("secondary")}
            >
              <Copy aria-hidden className="size-4" />
              {t("create")}
            </Link>
            {role.isSystem || members > 0 ? null : <DeleteRole id={role.id} name={name} />}
          </div>
        )}
      </div>
      <RoleEditor id={role.id} name={role.name} grants={role.grants} locked={locked} />
    </div>
  );
}
