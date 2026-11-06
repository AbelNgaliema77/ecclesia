import { can } from "@ecclesia/domain/access";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ChurchSwitcher } from "@/components/shell/church-switcher";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { type NavItem, Sidebar } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { Wordmark } from "@/components/shell/wordmark";
import { localized } from "@/i18n/config";
import { getChurchContext } from "@/server/context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getChurchContext();
  if (context.accessLevel === "locked") redirect("/locked");

  const [t, ts, locale, format] = await Promise.all([
    getTranslations("nav"),
    getTranslations("shell"),
    getLocale(),
    getFormatter(),
  ]);
  const { actor, membership } = context;

  const items: NavItem[] = [
    { key: "dashboard", href: "/", label: t("dashboard") },
    ...(can(actor, "people.read")
      ? [{ key: "people", href: "/people", label: t("people") } as const]
      : []),
    ...(can(actor, "teams.read")
      ? [{ key: "teams", href: "/teams", label: t("teams") } as const]
      : []),
    ...(can(actor, "attendance.capture") || can(actor, "attendance.read")
      ? [{ key: "attendance", href: "/attendance", label: t("attendance") } as const]
      : []),
    { key: "finance", href: null, label: t("finance"), badge: t("soon") },
    { key: "inventory", href: null, label: t("inventory"), badge: t("soon") },
  ];

  const trialEndsAt =
    membership.subscription?.status === "trialing" ? membership.subscription.trialEndsAt : null;

  return (
    <div className="min-h-dvh lg:pl-64">
      <div className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-paper px-4 sm:px-8">
        <Sidebar
          items={items}
          navLabel={t("main")}
          openLabel={ts("openMenu")}
          closeLabel={ts("closeMenu")}
          header={<Wordmark />}
          footer={
            <UserMenu
              name={context.user.name}
              email={context.user.email}
              roleLabel={localized(context.roleName, locale)}
              signOutLabel={ts("signOut")}
            />
          }
        />
        <div className="min-w-0 flex-1">
          <ChurchSwitcher
            currentId={membership.churchId}
            currentName={membership.churchName}
            churches={context.memberships.map((m) => ({ id: m.churchId, name: m.churchName }))}
            label={ts("switchChurch")}
          />
        </div>
        <LocaleSwitcher />
      </div>
      {membership.isDemo ? (
        <p className="border-b border-candle-100 bg-candle-100/60 px-4 py-2 text-sm text-candle-700 sm:px-8">
          {ts("demo")}
        </p>
      ) : null}
      {context.accessLevel === "readOnly" ? (
        <p
          role="status"
          className="border-b border-danger-50 bg-danger-50 px-4 py-2 text-sm text-danger-600 sm:px-8"
        >
          {ts("readOnly")}
        </p>
      ) : trialEndsAt ? (
        <p className="border-b border-line bg-surface px-4 py-2 text-sm text-ink-soft sm:px-8">
          {ts("trialEnds", { date: format.dateTime(trialEndsAt, { dateStyle: "long" }) })}
        </p>
      ) : null}
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
