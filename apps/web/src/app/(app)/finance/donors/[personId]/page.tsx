import { displayName } from "@ecclesia/domain/people";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { localized } from "@/i18n/config";
import { DonorForm, IssueCertificatesButton } from "@/modules/finance/donor-forms";
import { Money } from "@/modules/finance/money";
import { loadDonor } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Donor" };

type PageProps = { params: Promise<{ personId: string }> };

export default async function DonorPage({ params }: PageProps) {
  const { personId } = await params;
  const [data, t, tc, tm, format, locale] = await Promise.all([
    loadDonor(personId),
    getTranslations("finance.donors"),
    getTranslations("finance.certificates"),
    getTranslations("finance.methods"),
    getFormatter(),
    getLocale(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/finance/donors" label={t("back")} />
      <header>
        <h1 className="text-[2rem] leading-tight font-bold">{displayName(data.person)}</h1>
        <p className="mt-1 text-ink-soft">
          {data.profile?.givingNumber
            ? t("numbered", { number: data.profile.givingNumber })
            : t("noNumber")}
          {" · "}
          <Link
            href={`/people/${data.person.id}`}
            className="font-semibold text-accent hover:underline"
          >
            {t("openProfile")}
          </Link>
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          {data.canEdit ? <DonorForm personId={data.person.id} profile={data.profile} /> : null}
          <section className="card overflow-hidden">
            <h2 className="border-b border-line px-5 py-4 text-lg font-bold">{t("recent")}</h2>
            {data.recent.length === 0 ? (
              <p className="p-5 text-sm text-ink-soft">{t("noGifts")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recent.map((gift) => (
                  <li
                    key={gift.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm"
                  >
                    <span className="w-28 text-ink-soft">
                      {format.dateTime(new Date(`${gift.receivedOn}T12:00:00Z`), {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      })}
                    </span>
                    <span className="min-w-0 flex-1">
                      {localized(gift.fundName, locale)} · {tm(gift.method)}
                      {gift.voidedAt ? (
                        <span className="ml-2">
                          <Badge tone="danger">{t("void")}</Badge>
                        </span>
                      ) : null}
                    </span>
                    <Money
                      cents={gift.amountCents}
                      currency={data.currency}
                      className={gift.voidedAt ? "text-ink-faint line-through" : "font-semibold"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          <section className="card p-5">
            <h2 className="text-lg font-bold">{t("byYear")}</h2>
            {data.years.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">{t("noGifts")}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {data.years.map((year) => (
                  <li key={year.year} className="flex justify-between gap-4">
                    <span className="text-ink-soft">{year.year}</span>
                    <Money
                      cents={year.totalCents}
                      currency={data.currency}
                      className="font-semibold"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card p-5">
            <h2 className="text-lg font-bold">{tc("title")}</h2>
            {!data.certificatesEnabled ? (
              <p className="mt-2 text-sm text-ink-soft">{tc("notSetUp")}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {data.deductible.map((row) => (
                  <li key={row.year} className="flex items-center gap-3 text-sm">
                    <span className="flex-1">
                      <span className="block font-semibold">
                        {tc("taxYear", { start: row.year - 1, end: row.year })}
                      </span>
                      <Money
                        cents={row.totalCents}
                        currency={data.currency}
                        className="text-ink-soft"
                      />
                    </span>
                    {row.certificate ? (
                      <Link
                        href={`/print/certificates/${data.person.id}?year=${row.year}`}
                        className="font-semibold text-accent hover:underline"
                      >
                        {tc("view")}
                      </Link>
                    ) : row.totalCents > 0 && data.canEdit ? (
                      <IssueCertificatesButton
                        year={row.year}
                        personId={data.person.id}
                        label={tc("issue")}
                        variant="soft"
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
