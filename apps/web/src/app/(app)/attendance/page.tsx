import { attendance } from "@ecclesia/db/repositories";
import { can } from "@ecclesia/domain/access";
import { CalendarCheck2, CalendarPlus, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { localized } from "@/i18n/config";
import { StartServiceForm } from "@/modules/attendance/start-service-form";
import { readChurch } from "@/server/queries";

export const metadata: Metadata = { title: "Attendance" };

const todayIn = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export default async function AttendancePage() {
  const [data, t, format, locale] = await Promise.all([
    readChurch(
      ["attendance.capture", "attendance.read"],
      async ({ tx, actor, membership, accessLevel }) => ({
        serviceTypes: await attendance.listServiceTypes(tx),
        recent: await attendance.listRecentServices(tx, 20),
        timezone: membership.timezone,
        readOnly: accessLevel !== "full" || !can(actor, "attendance.capture"),
      }),
    ),
    getTranslations("attendance"),
    getFormatter(),
    getLocale(),
  ]);

  const today = todayIn(data.timezone);
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const defaultType =
    data.serviceTypes.find((s) => s.dayOfWeek === weekday) ?? data.serviceTypes[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} lead={t("lead")} />

      {data.readOnly ? null : (
        <section className="hero rounded-hero p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="glass inline-flex size-11 items-center justify-center rounded-control">
              <CalendarPlus aria-hidden className="size-5" />
            </span>
            <h2 className="text-xl font-bold">{t("newService")}</h2>
          </div>
          <StartServiceForm
            serviceTypes={data.serviceTypes.map((s) => ({
              id: s.id,
              label: `${localized(s.name, locale)}${s.startsAt ? ` (${s.startsAt.slice(0, 5)})` : ""}`,
            }))}
            defaultServiceTypeId={defaultType?.id ?? null}
            today={today}
          />
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold">{t("recent")}</h2>
        {data.recent.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={CalendarCheck2} message={t("empty")} />
          </div>
        ) : (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {data.recent.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/attendance/${service.id}`}
                  className="card group flex items-center gap-4 p-3 pr-4 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-control bg-muted leading-none">
                    <span className="text-[0.625rem] font-semibold text-ink-faint">
                      {format.dateTime(service.occursAt, { month: "short" })}
                    </span>
                    <span className="font-display text-xl font-bold">
                      {format.dateTime(service.occursAt, { day: "numeric" })}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {localized(service.serviceTypeName, locale)}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {format.dateTime(service.occursAt, { weekday: "long", year: "numeric" })}
                    </span>
                  </span>
                  {service.categoriesCaptured === 0 ? (
                    <span className="rounded-full bg-gold-soft px-2.5 py-1 text-xs font-semibold text-gold-ink">
                      {t("notCaptured")}
                    </span>
                  ) : (
                    <span className="rounded-full bg-brand-soft px-2.5 py-1 text-sm font-bold text-brand-soft-ink">
                      {format.number(service.total)}
                    </span>
                  )}
                  <ChevronRight aria-hidden className="size-4 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
