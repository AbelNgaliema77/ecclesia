import { can } from "@ecclesia/domain/access";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AccountMenu } from "@/components/shell/account-menu";
import { ChurchSwitcher } from "@/components/shell/church-switcher";
import { CommandPalette } from "@/components/shell/command-palette";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import type { NavItem } from "@/components/shell/nav-items";
import { Sidebar } from "@/components/shell/sidebar";
import { TabBar } from "@/components/shell/tab-bar";
import { ThemeSwitcher } from "@/components/shell/theme-switcher";
import { Mark, Wordmark } from "@/components/shell/wordmark";
import { localized } from "@/i18n/config";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import { getChurchContext } from "@/server/context";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getChurchContext();
  if (context.accessLevel === "locked") redirect("/locked");

  const [t, ts, locale, format, store] = await Promise.all([
    getTranslations("nav"),
    getTranslations("shell"),
    getLocale(),
    getFormatter(),
    cookies(),
  ]);
  const { actor, membership } = context;
  const storedTheme = store.get(THEME_COOKIE)?.value;
  const theme = isTheme(storedTheme) ? storedTheme : "system";

  const items: NavItem[] = [
    { key: "dashboard", href: "/", label: t("dashboard"), shortLabel: t("home") },
    ...(can(actor, "people.read")
      ? [{ key: "people", href: "/people", label: t("people") } as const]
      : []),
    ...(can(actor, "attendance.capture") || can(actor, "attendance.read")
      ? [{ key: "attendance", href: "/attendance", label: t("attendance") } as const]
      : []),
    ...(can(actor, "teams.read")
      ? [{ key: "teams", href: "/teams", label: t("teams") } as const]
      : []),
    { key: "finance", href: null, label: t("finance"), badge: t("soon") },
    { key: "inventory", href: null, label: t("inventory"), badge: t("soon") },
    ...(can(actor, "settings.manage") || can(actor, "users.manage")
      ? [{ key: "settings", href: "/settings", label: t("settings") } as const]
      : []),
  ];

  const trialEndsAt =
    membership.subscription?.status === "trialing" ? membership.subscription.trialEndsAt : null;

  const account = (compact: boolean, placement: "up" | "down") => (
    <AccountMenu
      name={context.user.name}
      email={context.user.email}
      roleLabel={localized(context.roleName, locale)}
      signOutLabel={ts("signOut")}
      accountLabel={ts("account")}
      compact={compact}
      placement={placement}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-soft">{ts("theme.label")}</span>
        <ThemeSwitcher current={theme} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-soft">{ts("language")}</span>
        <LocaleSwitcher />
      </div>
    </AccountMenu>
  );

  const palette = (variant: "bar" | "icon") => (
    <CommandPalette
      items={items}
      variant={variant}
      canAddPerson={can(actor, "people.write")}
      canCapture={can(actor, "attendance.capture")}
      canSearchPeople={can(actor, "people.read")}
    />
  );

  const banner = membership.isDemo
    ? { tone: "gold", text: ts("demo") }
    : context.accessLevel === "readOnly"
      ? { tone: "danger", text: ts("readOnly") }
      : trialEndsAt
        ? {
            tone: "gold",
            text: ts("trialEnds", { date: format.dateTime(trialEndsAt, { dateStyle: "long" }) }),
          }
        : null;

  return (
    <div className="min-h-dvh pb-28 lg:pb-0 lg:pl-[17.5rem]">
      <Sidebar
        items={items}
        label={t("main")}
        header={<Wordmark />}
        church={
          <ChurchSwitcher
            currentId={membership.churchId}
            currentName={membership.churchName}
            churches={context.memberships.map((m) => ({ id: m.churchId, name: m.churchName }))}
            label={ts("switchChurch")}
          />
        }
        footer={account(false, "up")}
      />

      <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-8 lg:h-20">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:hidden">
            <Mark className="size-8 shrink-0" />
            <span className="truncate text-[0.9375rem] font-semibold">{membership.churchName}</span>
          </div>
          <div className="hidden flex-1 lg:block">{palette("bar")}</div>
          <div className="lg:hidden">{palette("icon")}</div>
          <div className="hidden items-center gap-2 lg:flex">
            <ThemeSwitcher current={theme} />
            <LocaleSwitcher />
          </div>
          <div className="lg:hidden">{account(true, "down")}</div>
        </div>
      </header>

      {banner ? (
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <p
            role={banner.tone === "danger" ? "status" : undefined}
            className={
              banner.tone === "danger"
                ? "rounded-control bg-danger-soft px-4 py-2.5 text-sm font-medium text-danger"
                : "rounded-control bg-gold-soft px-4 py-2.5 text-sm font-medium text-gold-ink"
            }
          >
            {banner.text}
          </p>
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 sm:px-8 lg:pt-8">{children}</main>

      <TabBar items={items} label={t("main")} />
    </div>
  );
}
