import { formatCertificateNumber } from "@ecclesia/domain/finance";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { formatMoney } from "@/modules/finance/money";
import { PrintButton } from "@/modules/finance/print-button";
import { loadCertificate } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Section 18A certificate" };

type PageProps = {
  params: Promise<{ personId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CertificatePrintPage({ params, searchParams }: PageProps) {
  const [{ personId }, query] = await Promise.all([params, searchParams]);
  const year = Number(Array.isArray(query.year) ? query.year[0] : query.year);
  const [data, t, format] = await Promise.all([
    loadCertificate(personId, year),
    getTranslations("finance.certificates.document"),
    getFormatter(),
  ]);
  const { certificate, settings, donor, profile } = data;
  const date = (iso: string) =>
    format.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: "long", timeZone: "UTC" });
  const donorName = donor ? `${donor.firstName} ${donor.lastName}` : "–";
  const rows: [string, string][] = [
    [t("number"), formatCertificateNumber(certificate.taxYear, certificate.sequence)],
    [t("issued"), format.dateTime(certificate.issuedAt, { dateStyle: "long" })],
    [t("organisation"), settings.legalName ?? data.churchName],
    [t("pbo"), settings.pboNumber ?? "–"],
    [t("orgAddress"), settings.address ?? "–"],
    [t("donor"), donorName],
    [t("donorAddress"), profile?.address ?? "–"],
    [t("donorTax"), profile?.taxNumber ?? "–"],
    [t("period"), `${date(data.range.from)} – ${date(data.range.to)}`],
    [t("nature"), t("natureValue")],
    [t("amount"), formatMoney(format, certificate.amountCents, data.currency)],
  ];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <BackLink href="/finance/certificates" label={t("back")} />
        <PrintButton label={t("print")} />
      </div>
      <article className="rounded-card bg-white p-8 text-[#0c1713] shadow-pop sm:p-12 print:rounded-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-[#0f6b47] pb-5">
          <p className="text-sm font-semibold tracking-wide text-[#0f6b47]">
            {settings.legalName ?? data.churchName}
          </p>
          <h1 className="mt-2 text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-[#5d6b65]">{t("subtitle")}</p>
        </header>
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-[13rem_1fr]">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="font-semibold text-[#5d6b65]">{label}</dt>
              <dd className="whitespace-pre-line">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-sm leading-relaxed">{t("declaration")}</p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2">
          <div>
            <div className="h-12 border-b border-[#0c1713]" />
            <p className="mt-2 text-sm">{settings.signatoryName ?? t("signatory")}</p>
            <p className="text-xs text-[#5d6b65]">{t("signatureLabel")}</p>
          </div>
          <div>
            <div className="h-12 border-b border-[#0c1713]" />
            <p className="mt-2 text-sm">{t("dateLabel")}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
