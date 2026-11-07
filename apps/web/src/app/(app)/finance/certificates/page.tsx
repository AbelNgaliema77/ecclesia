import { certificateReadiness } from "@ecclesia/domain/finance";
import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { IssueCertificatesButton } from "@/modules/finance/donor-forms";
import { Money } from "@/modules/finance/money";
import { loadCertificates } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Tax certificates" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CertificatesPage({ searchParams }: PageProps) {
  const [data, t, format] = await Promise.all([
    loadCertificates(await searchParams),
    getTranslations("finance.certificates"),
    getFormatter(),
  ]);
  const readiness = certificateReadiness(data.settings);
  const outstanding = data.rows.filter(
    (row) => row.certificateAmountCents !== row.totalCents,
  ).length;
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/finance/donors" label={t("back")} />
      <PageHeader title={t("title")} lead={t("lead")} />
      <form className="flex flex-wrap items-end gap-3">
        <Field id="certificate-year" label={t("yearLabel")}>
          <Select
            id="certificate-year"
            name="year"
            defaultValue={String(data.year)}
            className="w-56"
          >
            {data.years.map((year) => (
              <option key={year} value={year}>
                {t("taxYear", { start: year - 1, end: year })}
              </option>
            ))}
          </Select>
        </Field>
        <button type="submit" className={buttonClasses("secondary")}>
          {t("show")}
        </button>
      </form>

      {!readiness.ready ? (
        <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm text-ink-soft">
            {t("missing", {
              fields: readiness.missing.map((field) => t(`fields.${field}`)).join(", "),
            })}
          </p>
          <Link href="/finance/settings" className={buttonClasses("primary", "sm")}>
            {t("openSettings")}
          </Link>
        </section>
      ) : null}

      {data.rows.length === 0 ? (
        <EmptyState icon={FileText} message={t("empty")} />
      ) : (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <p className="flex-1 text-sm text-ink-soft">
              {t("summary", { count: data.rows.length, outstanding })}
            </p>
            {readiness.ready && data.canIssue && outstanding > 0 ? (
              <IssueCertificatesButton
                year={data.year}
                label={t("issueAll", { count: outstanding })}
              />
            ) : null}
          </div>
          <ul className="divide-y divide-line">
            {data.rows.map((row) => {
              const current = row.certificateAmountCents === row.totalCents;
              return (
                <li
                  key={row.personId}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-sm"
                >
                  <span className="min-w-0 flex-1 basis-full sm:basis-0">
                    <span className="block font-semibold">
                      {row.preferredName ?? row.firstName} {row.lastName}
                    </span>
                    <span className="block text-xs text-ink-faint">
                      {[row.givingNumber, t("gifts", { count: row.giftCount })]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <Money
                    cents={row.totalCents}
                    currency={data.currency}
                    className="font-semibold"
                  />
                  {row.certificateSequence ? (
                    <Badge tone={current ? "brand" : "gold"}>
                      {current
                        ? t("issuedOn", {
                            date: row.certificateIssuedAt
                              ? format.dateTime(row.certificateIssuedAt, { dateStyle: "medium" })
                              : "–",
                          })
                        : t("changed")}
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{t("notIssued")}</Badge>
                  )}
                  {row.certificateSequence ? (
                    <Link
                      href={`/print/certificates/${row.personId}?year=${data.year}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      {t("view")}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
