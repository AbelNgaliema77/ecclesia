import { CircleAlert, Hourglass, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { localized } from "@/i18n/config";
import { BatchEditor } from "@/modules/finance/batch-editor";
import { DeleteBatchButton, VerifyBatchButtons } from "@/modules/finance/batch-review";
import { formatMoney, Money } from "@/modules/finance/money";
import { loadBatch } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Cash count" };

const TONES: Record<string, BadgeTone> = { draft: "neutral", submitted: "gold", verified: "brand" };

type PageProps = { params: Promise<{ id: string }> };

export default async function CountPage({ params }: PageProps) {
  const { id } = await params;
  const [data, t, format, locale] = await Promise.all([
    loadBatch(id),
    getTranslations("finance.counts"),
    getFormatter(),
    getLocale(),
  ]);
  const { batch } = data;
  const total = batch.lines.reduce((sum, line) => sum + line.amountCents, 0);
  const date = format.dateTime(new Date(`${batch.receivedOn}T12:00:00Z`), {
    dateStyle: "full",
    timeZone: "UTC",
  });
  const editable = batch.status === "draft" && data.canWrite && !data.locked;
  const personName = (line: (typeof batch.lines)[number]) =>
    line.personLastName ? `${line.personFirstName} ${line.personLastName}` : null;
  const byFund = data.funds
    .map((fund) => ({
      fund,
      cents: batch.lines
        .filter((l) => l.fundId === fund.id)
        .reduce((sum, l) => sum + l.amountCents, 0),
    }))
    .filter((row) => row.cents > 0);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/finance/counts" label={t("back")} />
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[2rem] leading-tight font-bold">{date}</h1>
          <p className="mt-1 text-ink-soft">
            {batch.serviceName ? `${localized(batch.serviceName, locale)} · ` : ""}
            {t("lines", { count: batch.lines.length })}
          </p>
        </div>
        <Badge tone={TONES[batch.status] ?? "neutral"}>{t(`status.${batch.status}`)}</Badge>
        {editable ? <DeleteBatchButton id={batch.id} /> : null}
      </header>

      {batch.status === "draft" && batch.returnedReason ? (
        <p className="flex items-start gap-2.5 rounded-control bg-gold-soft px-4 py-3 text-sm font-medium text-gold-ink">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t("returnedNote", { reason: batch.returnedReason })}
        </p>
      ) : null}
      {data.locked ? (
        <p className="rounded-control bg-muted px-4 py-3 text-sm text-ink-soft">
          {t("monthClosed")}
        </p>
      ) : null}

      {editable ? (
        <BatchEditor
          batchId={batch.id}
          receivedOn={batch.receivedOn}
          notes={batch.notes}
          today={data.today}
          currency={data.currency}
          funds={data.funds}
          showNames={data.showNames}
          initialLines={batch.lines.map((line) => ({
            fundId: line.fundId,
            personId: line.personId,
            personName: personName(line),
            amountCents: line.amountCents,
          }))}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs font-semibold text-ink-faint">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    {t("fund")}
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    {t("envelope")}
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    {t("amount")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {batch.lines.map((line) => {
                  const fund = data.funds.find((f) => f.id === line.fundId);
                  return (
                    <tr key={line.id}>
                      <td className="px-5 py-3">{fund ? localized(fund.name, locale) : "–"}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {data.showNames
                          ? (personName(line) ?? t("loose"))
                          : line.personId
                            ? t("envelopeHidden")
                            : t("loose")}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        <Money cents={line.amountCents} currency={data.currency} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <aside className="flex flex-col gap-4">
            <section className="card flex flex-col gap-3 p-5">
              <h2 className="text-lg font-bold">{t("totals")}</h2>
              <ul className="flex flex-col gap-2 text-sm">
                {byFund.map(({ fund, cents }) => (
                  <li key={fund.id} className="flex justify-between gap-4">
                    <span className="text-ink-soft">{localized(fund.name, locale)}</span>
                    <Money cents={cents} currency={data.currency} className="font-semibold" />
                  </li>
                ))}
              </ul>
              <p className="flex justify-between gap-4 border-t border-line pt-3 text-lg font-bold">
                <span>{t("grandTotal")}</span>
                <Money cents={total} currency={data.currency} />
              </p>
            </section>
            {batch.status === "submitted" ? (
              <section className="card flex flex-col gap-3 p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <Hourglass aria-hidden className="size-4 text-gold-ink" />
                  {t("awaitingTitle")}
                </h2>
                <p className="text-sm text-ink-soft">
                  {t("awaitingLead", { name: batch.submittedByName ?? "–" })}
                </p>
                {batch.submittedBy === data.userId ? (
                  <p className="rounded-control bg-muted px-3 py-2.5 text-sm text-ink-soft">
                    {t("needSecond")}
                  </p>
                ) : data.canWrite && !data.locked ? (
                  <VerifyBatchButtons
                    id={batch.id}
                    total={formatMoney(format, total, data.currency)}
                  />
                ) : null}
              </section>
            ) : null}
            {batch.status === "verified" ? (
              <section className="card flex flex-col gap-2 p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck aria-hidden className="size-4 text-brand-soft-ink" />
                  {t("verifiedTitle")}
                </h2>
                <p className="text-sm text-ink-soft">
                  {t("verifiedLead", {
                    first: batch.submittedByName ?? "–",
                    second: batch.verifiedByName ?? "–",
                    date: batch.verifiedAt
                      ? format.dateTime(batch.verifiedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "–",
                  })}
                </p>
              </section>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
