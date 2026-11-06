import { can } from "@ecclesia/domain/access";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { localized } from "@/i18n/config";
import { AttendanceTrendChart } from "@/modules/dashboard/attendance-trend-chart";
import { loadDashboard } from "@/modules/dashboard/queries";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [context, t, format, locale] = await Promise.all([
    getChurchContext(),
    getTranslations("dashboard"),
    getFormatter(),
    getLocale(),
  ]);
  const firstName = context.user.name.split(" ")[0] ?? context.user.name;

  const greeting = (
    <header>
      <p className="text-sm text-ink-faint">
        {format.dateTime(new Date(), { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className="mt-1 font-display text-display font-medium tracking-tight">
        {t("greeting", { name: firstName })}
      </h1>
    </header>
  );

  if (!can(context.actor, "attendance.read")) {
    return (
      <div className="flex flex-col gap-8">
        {greeting}
        {can(context.actor, "attendance.capture") ? (
          <Link href="/attendance" className={buttonClasses("primary", "lg")}>
            {t("captureFirst")}
          </Link>
        ) : null}
      </div>
    );
  }

  const data = await loadDashboard();
  const hasData = data.trend.some((m) => m.services > 0);

  return (
    <div className="flex flex-col gap-10">
      {greeting}

      <section
        aria-label={t("title")}
        className="grid gap-px overflow-hidden rounded-panel border border-line bg-line sm:grid-cols-3"
      >
        <div className="bg-surface p-6">
          <p className="text-sm text-ink-soft">{t("averageAttendance")}</p>
          <p className="mt-3 font-display text-[2.75rem] leading-none font-medium tracking-tight">
            {data.latest ? format.number(data.latest.averagePerService) : "–"}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-soft">
            {data.change === null ? (
              t("noChange")
            ) : (
              <>
                {data.change >= 0 ? (
                  <ArrowUpRight aria-hidden className="size-4 text-sanctuary-700" />
                ) : (
                  <ArrowDownRight aria-hidden className="size-4 text-danger-600" />
                )}
                {t("change", { value: data.change })}
              </>
            )}
          </p>
          {data.latest ? (
            <p className="mt-1 text-xs text-ink-faint">
              {t("lastMonth", {
                month: format.dateTime(new Date(`${data.latest.month}-15T12:00:00Z`), {
                  month: "long",
                  year: "numeric",
                  timeZone: "UTC",
                }),
              })}
            </p>
          ) : null}
        </div>
        <div className="bg-surface p-6">
          <p className="text-sm text-ink-soft">{t("firstTimers")}</p>
          <p className="mt-3 font-display text-[2.75rem] leading-none font-medium tracking-tight">
            {format.number(data.firstTimers)}
          </p>
          <p className="mt-3 text-sm text-ink-soft">{t("last30Days")}</p>
        </div>
        <div className="bg-surface p-6">
          <p className="text-sm text-ink-soft">{t("activePeople")}</p>
          <p className="mt-3 font-display text-[2.75rem] leading-none font-medium tracking-tight">
            {format.number(data.peopleTotal)}
          </p>
          <p className="mt-3 text-sm text-ink-soft">{t("serving", { count: data.serving })}</p>
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface p-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-xl font-medium">{t("trendTitle")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("trendLead")}</p>
        </div>
        <div className="mt-6">
          {hasData ? (
            <AttendanceTrendChart trend={data.trend} categories={data.categories} />
          ) : (
            <div className="flex flex-col items-start gap-4 rounded-control border border-dashed border-line-strong p-8">
              <p className="max-w-md text-ink-soft">{t("noData")}</p>
              <Link href="/attendance" className={buttonClasses("primary")}>
                {t("captureFirst")}
              </Link>
            </div>
          )}
        </div>
      </section>

      {data.recent.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-medium">{t("recentServices")}</h2>
            <Link
              href="/attendance"
              className="text-sm font-medium text-sanctuary-700 hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {data.recent.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/attendance/${service.id}`}
                  className="flex items-center gap-4 py-3.5 hover:bg-surface"
                >
                  <span className="w-28 shrink-0 text-sm text-ink-faint">
                    {format.dateTime(service.occursAt, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="flex-1 text-[0.9375rem]">
                    {localized(service.serviceTypeName, locale)}
                  </span>
                  <span className="font-medium">{format.number(service.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
