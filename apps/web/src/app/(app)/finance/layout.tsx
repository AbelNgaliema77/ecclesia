import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { canOpenFinance, visibleFinanceTabs } from "@/modules/finance/access";
import { SettingsTabs } from "@/modules/settings/settings-tabs";
import { getChurchContext } from "@/server/context";

export default async function FinanceLayout({ children }: { children: ReactNode }) {
  const context = await getChurchContext();
  if (!canOpenFinance(context.actor, context.financeLocked)) notFound();
  const t = await getTranslations("finance");
  const tabs = visibleFinanceTabs(context.actor);

  return (
    <div className="flex flex-col gap-6">
      {context.financeLocked ? (
        <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="icon-tile size-11 shrink-0">
            <ShieldAlert aria-hidden className="size-5" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold">{t("gate.title")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("gate.lead")}</p>
          </div>
          <Link href="/account/security" className={buttonClasses("primary")}>
            {t("gate.action")}
          </Link>
        </section>
      ) : null}
      {tabs.length > 0 ? (
        <>
          <SettingsTabs
            root="/finance"
            label={t("tabsLabel")}
            tabs={tabs.map((tab) => ({ href: tab.href, label: t(`tabs.${tab.key}`) }))}
          />
          {children}
        </>
      ) : null}
    </div>
  );
}
