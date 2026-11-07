import { attendance } from "@ecclesia/db/repositories";
import { can } from "@ecclesia/domain/access";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { localized } from "@/i18n/config";
import { HeadcountForm } from "@/modules/attendance/headcount-form";
import { readChurch } from "@/server/queries";

export const metadata: Metadata = { title: "Headcount" };

export default async function ServiceHeadcountPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  if (!z.uuid().safeParse(serviceId).success) notFound();

  const [data, t, format, locale] = await Promise.all([
    readChurch(
      ["attendance.capture", "attendance.read"],
      async ({ tx, actor, accessLevel, membership }) => ({
        churchId: membership.churchId,
        service: await attendance.getServiceWithHeadcounts(tx, serviceId),
        categories: await attendance.listAttendanceCategories(tx),
        readOnly: accessLevel !== "full" || !can(actor, "attendance.capture"),
      }),
    ),
    getTranslations("attendance"),
    getFormatter(),
    getLocale(),
  ]);
  if (!data.service) notFound();

  const initial = Object.fromEntries(data.service.counts.map((c) => [c.categoryId, c.count]));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <BackLink href="/attendance" label={t("back")} />
      <PageHeader
        title={localized(data.service.serviceTypeName, locale)}
        lead={`${format.dateTime(data.service.occursAt, { dateStyle: "full", timeStyle: "short" })}. ${t("captureLead")}`}
      />
      <HeadcountForm
        churchId={data.churchId}
        serviceId={data.service.id}
        categories={data.categories.map((c) => ({
          id: c.id,
          label: localized(c.name, locale),
          color: c.color,
        }))}
        initial={initial}
        disabled={data.readOnly}
      />
    </div>
  );
}
