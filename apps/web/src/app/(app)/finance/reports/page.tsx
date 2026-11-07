import {
  addMonths,
  lastDayOfMonth,
  monthOf,
  taxYearEnding,
  taxYearRange,
} from "@ecclesia/domain/finance";
import { Download, Lock } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { localized } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { Money } from "@/modules/finance/money";
import { CloseMonthButton, ReopenMonthButton } from "@/modules/finance/period-controls";
import { PrintButton } from "@/modules/finance/print-button";
import { loadReports } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Reports" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ReportsPage({ searchParams }: PageProps) {
  const [data, t, format, locale] = await Promise.all([
    loadReports(await searchParams),
    getTranslations("finance.reports"),
    getFormatter(),
    getLocale(),
  ]);
  const { statement, range, today } = data;
  const month = monthOf(today);
  const lastMonth = addMonths(month, -1);
  const year = today.slice(0, 4);
  const taxYear = taxYearRange(taxYearEnding(today));
  const presets = [
    { key: "thisMonth", from: month, to: today },
    { key: "lastMonth", from: lastMonth, to: lastDayOfMonth(lastMonth) },
    { key: "thisYear", from: `${year}-01-01`, to: today },
    { key: "lastYear", from: `${Number(year) - 1}-01-01`, to: `${Number(year) - 1}-12-31` },
    { key: "taxYear", from: taxYear.from, to: today },
  ];
  const day = (iso: string) =>
    format.dateTime(new Date(`${iso}T12:00:00Z`), { dateStyle: "long", timeZone: "UTC" });
  const monthLabel = (iso: string) =>
    format.dateTime(new Date(`${iso}T12:00:00Z`), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <section className="card flex flex-col gap-4 p-5 print:hidden">
        <ul className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <li key={preset.key}>
              <Link
                href={`/finance/reports?from=${preset.from}&to=${preset.to}` as Route}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-colors",
                  preset.from === range.from && preset.to === range.to
                    ? "bg-ink text-canvas ring-transparent"
                    : "text-ink-soft ring-line hover:bg-muted",
                )}
              >
                {t(`presets.${preset.key}`)}
              </Link>
            </li>
          ))}
        </ul>
        <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field id="report-from" label={t("from")}>
            <Input id="report-from" name="from" type="date" defaultValue={range.from} />
          </Field>
          <Field id="report-to" label={t("to")}>
            <Input id="report-to" name="to" type="date" defaultValue={range.to} />
          </Field>
          <button type="submit" className={buttonClasses("secondary")}>
            {t("apply")}
          </button>
        </form>
      </section>

      <article className="card p-5 sm:p-8 print:shadow-none print:ring-0">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="text-sm font-semibold text-ink-faint">{data.churchName}</p>
            <h2 className="text-xl font-bold">{t("statementTitle")}</h2>
            <p className="text-sm text-ink-soft">
              {t("period", { from: day(range.from), to: day(range.to) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <a
              href={`/finance/reports/export?from=${range.from}&to=${range.to}`}
              className={buttonClasses("secondary", "sm")}
              download
            >
              <Download aria-hidden className="size-4" />
              {t("exportCsv")}
            </a>
            <PrintButton label={t("print")} />
          </div>
        </header>
        <div className="mt-5 grid gap-8 md:grid-cols-2">
          {(
            [
              ["income", statement.incomeRows, statement.totalIncome],
              ["expenses", statement.expenseRows, statement.totalExpenses],
            ] as const
          ).map(([key, rows, total]) => (
            <section key={key}>
              <h3 className="text-sm font-bold tracking-wide text-ink-faint">{t(key)}</h3>
              {rows.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">{t("nothing")}</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {rows.map((row) => (
                    <li key={row.id} className="flex justify-between gap-4">
                      <span className="text-ink-soft">{localized(row.name, locale)}</span>
                      <Money cents={row.cents} currency={data.currency} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 flex justify-between gap-4 border-t border-line pt-2.5 font-bold">
                <span>{t(`total.${key}`)}</span>
                <Money cents={total} currency={data.currency} />
              </p>
            </section>
          ))}
        </div>
        <p
          className={cn(
            "mt-8 flex justify-between gap-4 rounded-control px-4 py-3 text-lg font-bold",
            statement.net < 0 ? "bg-danger-soft text-danger" : "bg-brand-soft text-brand-soft-ink",
          )}
        >
          <span>{statement.net < 0 ? t("deficit") : t("surplus")}</span>
          <Money cents={statement.net} currency={data.currency} />
        </p>
      </article>

      <section className="card overflow-hidden print:hidden">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">{t("monthEnd")}</h2>
          <p className="mt-1 text-sm text-ink-soft">{t("monthEndLead")}</p>
        </div>
        <ul className="divide-y divide-line">
          {data.months.map((entry) => (
            <li
              key={entry.month}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm"
            >
              <span className="min-w-0 flex-1 font-semibold">{monthLabel(entry.month)}</span>
              {entry.closed ? (
                <span className="inline-flex items-center gap-1.5 text-ink-soft">
                  <Lock aria-hidden className="size-3.5" />
                  {t("closedBy", {
                    name: entry.info?.closedByName ?? "–",
                    date: entry.info
                      ? format.dateTime(entry.info.closedAt, { dateStyle: "medium" })
                      : "–",
                  })}
                </span>
              ) : (
                <span className="text-ink-faint">{t("open")}</span>
              )}
              {data.canClose ? (
                entry.closed ? (
                  <ReopenMonthButton month={entry.month} label={monthLabel(entry.month)} />
                ) : (
                  <CloseMonthButton month={entry.month} label={monthLabel(entry.month)} />
                )
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
