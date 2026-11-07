import { ChevronRight, ClipboardCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { localized } from "@/i18n/config";
import { Money } from "@/modules/finance/money";
import { NewCountDialog } from "@/modules/finance/new-count-dialog";
import { loadBatches } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Cash counts" };

const TONES: Record<string, BadgeTone> = { draft: "neutral", submitted: "gold", verified: "brand" };

export default async function CountsPage() {
  const [data, t, format, locale] = await Promise.all([
    loadBatches(),
    getTranslations("finance.counts"),
    getFormatter(),
    getLocale(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          data.canWrite ? (
            <NewCountDialog today={data.today} services={data.services} timeZone={data.timeZone} />
          ) : null
        }
      />
      {data.batches.length === 0 ? (
        <EmptyState icon={ClipboardCheck} message={t("empty")} />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data.batches.map((batch) => (
            <li key={batch.id}>
              <Link
                href={`/finance/counts/${batch.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-muted"
              >
                <span className="min-w-0 flex-1 basis-full sm:basis-0">
                  <span className="block font-semibold">
                    {format.dateTime(new Date(`${batch.receivedOn}T12:00:00Z`), {
                      dateStyle: "full",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span className="block text-sm text-ink-faint">
                    {[
                      batch.serviceName ? localized(batch.serviceName, locale) : null,
                      t("lines", { count: batch.lineCount }),
                      batch.status === "verified" && batch.submittedByName && batch.verifiedByName
                        ? t("countedBy", {
                            first: batch.submittedByName,
                            second: batch.verifiedByName,
                          })
                        : batch.status === "submitted" && batch.submittedByName
                          ? t("submittedBy", { name: batch.submittedByName })
                          : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <Badge tone={TONES[batch.status] ?? "neutral"}>{t(`status.${batch.status}`)}</Badge>
                <Money
                  cents={batch.totalCents}
                  currency={data.currency}
                  className="w-28 text-right font-semibold"
                />
                <ChevronRight aria-hidden className="size-4 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
