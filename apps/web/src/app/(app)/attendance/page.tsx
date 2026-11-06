import { attendance } from "@ecclesia/db/repositories";
import { can } from "@ecclesia/domain/access";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
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
        categoryCount: (await attendance.listAttendanceCategories(tx)).length,
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
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} lead={t("lead")} />

      <section className="rounded-panel border border-line bg-surface p-6">
        <h2 className="mb-4 font-display text-lg font-medium">{t("newService")}</h2>
        <StartServiceForm
          serviceTypes={data.serviceTypes.map((s) => ({
            id: s.id,
            label: `${localized(s.name, locale)}${s.startsAt ? ` (${s.startsAt.slice(0, 5)})` : ""}`,
          }))}
          defaultServiceTypeId={defaultType?.id ?? null}
          today={today}
          disabled={data.readOnly}
        />
      </section>

      <section>
        <h2 className="font-display text-xl font-medium">{t("recent")}</h2>
        {data.recent.length === 0 ? (
          <p className="mt-4 rounded-panel border border-dashed border-line-strong p-8 text-ink-soft">
            {t("empty")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {data.recent.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/attendance/${service.id}`}
                  className="flex items-center gap-4 py-3.5 hover:bg-surface"
                >
                  <span className="w-32 shrink-0 text-sm text-ink-faint">
                    {format.dateTime(service.occursAt, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="flex-1">{localized(service.serviceTypeName, locale)}</span>
                  {service.categoriesCaptured === 0 ? (
                    <span className="text-sm text-candle-700">{t("notCaptured")}</span>
                  ) : (
                    <span className="font-medium">{format.number(service.total)}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
