import { can } from "@ecclesia/domain/access";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarPlus,
  ChevronRight,
  type LucideIcon,
  UserPlus,
  Workflow,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { localized } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { AttendanceTrendChart } from "@/modules/dashboard/attendance-trend-chart";
import { loadDashboard } from "@/modules/dashboard/queries";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Dashboard" };

type QuickAction = { href: Route; icon: LucideIcon; title: string; lead: string };

export default async function DashboardPage() {
  const [context, t, format, locale] = await Promise.all([
    getChurchContext(),
    getTranslations("dashboard"),
    getFormatter(),
    getLocale(),
  ]);
  const { actor, membership } = context;
  const firstName = context.user.name.split(" ")[0] ?? context.user.name;

  const quick: QuickAction[] = [
    ...(can(actor, "attendance.capture")
      ? [
          {
            href: "/attendance" as Route,
            icon: CalendarPlus,
            title: t("quick.capture"),
            lead: t("quick.captureLead"),
          },
        ]
      : []),
    ...(can(actor, "people.write")
      ? [
          {
            href: "/people/new" as Route,
            icon: UserPlus,
            title: t("quick.addPerson"),
            lead: t("quick.addPersonLead"),
          },
        ]
      : []),
    ...(can(actor, "teams.read")
      ? [
          {
            href: "/teams" as Route,
            icon: Workflow,
            title: t("quick.teams"),
            lead: t("quick.teamsLead"),
          },
        ]
      : []),
  ];

  const data = can(actor, "attendance.read") ? await loadDashboard() : null;
  const hasData = data?.trend.some((m) => m.services > 0) ?? false;

  return (
    <div className="flex flex-col gap-6">
      <section className="hero relative overflow-hidden rounded-hero p-6 sm:p-8">
        <p className="text-sm font-medium text-hero-ink-soft">
          {format.dateTime(new Date(), { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <h1 className="mt-2 text-[2.25rem] leading-[1.05] font-bold sm:text-[3rem]">
          {t("greeting", { name: firstName })}
        </h1>
        <p className="mt-2 text-hero-ink-soft">
          {t("heroLead", { church: membership.churchName })}
        </p>

        {data ? (
          <div className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3">
            <div className="glass rounded-card p-3 sm:p-5">
              <p className="text-xs font-medium text-hero-ink-soft sm:text-sm">
                {t("averageAttendance")}
              </p>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 sm:mt-3">
                <span className="font-display text-[1.75rem] leading-none font-bold sm:text-[2.75rem]">
                  {data.latest ? format.number(data.latest.averagePerService) : "–"}
                </span>
                {data.change !== null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold",
                      data.change >= 0
                        ? "bg-[#34c38a]/25 text-[#b8f5d6]"
                        : "bg-[#f2796d]/25 text-[#ffd0ca]",
                    )}
                  >
                    {data.change >= 0 ? (
                      <ArrowUpRight aria-hidden className="size-3.5" />
                    ) : (
                      <ArrowDownRight aria-hidden className="size-3.5" />
                    )}
                    {format.number(Math.abs(data.change), { maximumFractionDigits: 1 })}%
                  </span>
                ) : null}
              </p>
              <p className="mt-2 hidden text-xs text-hero-ink-soft sm:block">
                {data.latest
                  ? t("lastMonth", {
                      month: format.dateTime(new Date(`${data.latest.month}-15T12:00:00Z`), {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }),
                    })
                  : t("noChange")}
              </p>
            </div>
            <div className="glass rounded-card p-3 sm:p-5">
              <p className="text-xs font-medium text-hero-ink-soft sm:text-sm">
                {t("firstTimers")}
              </p>
              <p className="mt-3 font-display text-[1.75rem] leading-none font-bold sm:text-[2.75rem]">
                {format.number(data.firstTimers)}
              </p>
              <p className="mt-2 hidden text-xs text-hero-ink-soft sm:block">{t("last30Days")}</p>
            </div>
            <div className="glass rounded-card p-3 sm:p-5">
              <p className="text-xs font-medium text-hero-ink-soft sm:text-sm">
                {t("activePeople")}
              </p>
              <p className="mt-3 font-display text-[1.75rem] leading-none font-bold sm:text-[2.75rem]">
                {format.number(data.peopleTotal)}
              </p>
              <p className="mt-2 hidden text-xs text-hero-ink-soft sm:block">
                {t("serving", { count: data.serving })}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {quick.length > 0 ? (
        <section aria-label={t("quick.title")} className="grid gap-3 sm:grid-cols-3">
          {quick.map(({ href, icon: Icon, title, lead }) => (
            <Link
              key={href}
              href={href}
              className="card group flex items-center gap-4 p-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong active:translate-y-0"
            >
              <span className="icon-tile size-12">
                <Icon aria-hidden className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{title}</span>
                <span className="block truncate text-sm text-ink-faint">{lead}</span>
              </span>
              <ChevronRight
                aria-hidden
                className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </section>
      ) : null}

      {data ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="card p-5 sm:p-6">
            <h2 className="text-xl font-bold">{t("trendTitle")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("trendLead")}</p>
            <div className="mt-6">
              {hasData ? (
                <AttendanceTrendChart trend={data.trend} categories={data.categories} />
              ) : (
                <EmptyState
                  icon={CalendarPlus}
                  message={t("noData")}
                  action={
                    <Link href="/attendance" className={buttonClasses("primary")}>
                      {t("captureFirst")}
                    </Link>
                  }
                />
              )}
            </div>
          </section>

          {data.recent.length > 0 ? (
            <section className="card flex flex-col p-5 sm:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-bold">{t("recentServices")}</h2>
                <Link
                  href="/attendance"
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  {t("viewAll")}
                </Link>
              </div>
              <ul className="mt-4 flex flex-col gap-1">
                {data.recent.map((service) => (
                  <li key={service.id}>
                    <Link
                      href={`/attendance/${service.id}`}
                      className="flex items-center gap-3 rounded-control p-2.5 transition-colors hover:bg-muted"
                    >
                      <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-control bg-muted leading-none">
                        <span className="text-[0.625rem] font-semibold text-ink-faint">
                          {format.dateTime(service.occursAt, { month: "short" })}
                        </span>
                        <span className="font-display text-lg font-bold">
                          {format.dateTime(service.occursAt, { day: "numeric" })}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9375rem] font-semibold">
                          {localized(service.serviceTypeName, locale)}
                        </span>
                        <span className="block text-xs text-ink-faint">
                          {format.dateTime(service.occursAt, {
                            weekday: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                      <span className="rounded-full bg-brand-soft px-2.5 py-1 text-sm font-bold text-brand-soft-ink">
                        {format.number(service.total)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
