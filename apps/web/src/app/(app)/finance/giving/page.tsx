import { GIVING_METHODS } from "@ecclesia/domain/finance";
import { Download, HandCoins, Search } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { localized } from "@/i18n/config";
import { RecordGiftDialog, VoidGiftDialog } from "@/modules/finance/gift-dialogs";
import { formatMoney, Money } from "@/modules/finance/money";
import { loadGiving } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Giving" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function GivingPage({ searchParams }: PageProps) {
  const data = await loadGiving(await searchParams);
  const [t, tm, format, locale] = await Promise.all([
    getTranslations("finance.giving"),
    getTranslations("finance.methods"),
    getFormatter(),
    getLocale(),
  ]);
  const { search } = data;
  const query = (page: number) => {
    const params = new URLSearchParams({ from: search.from, to: search.to });
    if (search.fundId) params.set("fund", search.fundId);
    if (search.method) params.set("method", search.method);
    if (search.q) params.set("q", search.q);
    if (search.voided) params.set("voided", "1");
    if (page > 1) params.set("page", String(page));
    return `/finance/giving?${params}`;
  };
  const name = (row: (typeof data.rows)[number]) =>
    row.personLastName
      ? `${row.personPreferredName ?? row.personFirstName} ${row.personLastName}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          <>
            {data.showNames ? (
              <a
                href={query(1).replace("/finance/giving?", "/finance/giving/export?")}
                className={buttonClasses("secondary")}
                download
              >
                <Download aria-hidden className="size-4" />
                {t("export")}
              </a>
            ) : null}
            {data.canCapture ? <RecordGiftDialog funds={data.funds} today={data.today} /> : null}
          </>
        }
      />

      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end sm:p-5">
        <Field id="filter-from" label={t("from")}>
          <Input
            id="filter-from"
            name="from"
            type="date"
            defaultValue={search.from}
            max={data.today}
          />
        </Field>
        <Field id="filter-to" label={t("to")}>
          <Input id="filter-to" name="to" type="date" defaultValue={search.to} max={data.today} />
        </Field>
        <Field id="filter-fund" label={t("fund")}>
          <Select id="filter-fund" name="fund" defaultValue={search.fundId ?? ""}>
            <option value="">{t("allFunds")}</option>
            {data.funds.map((fund) => (
              <option key={fund.id} value={fund.id}>
                {localized(fund.name, locale)}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="filter-method" label={t("method")}>
          <Select id="filter-method" name="method" defaultValue={search.method ?? ""}>
            <option value="">{t("allMethods")}</option>
            {GIVING_METHODS.map((method) => (
              <option key={method} value={method}>
                {tm(method)}
              </option>
            ))}
          </Select>
        </Field>
        {data.showNames ? (
          <Field id="filter-q" label={t("search")} className="sm:col-span-2 lg:col-span-3">
            <Input
              id="filter-q"
              name="q"
              type="search"
              defaultValue={search.q ?? ""}
              placeholder={t("searchPlaceholder")}
            />
          </Field>
        ) : null}
        <label className="flex h-11 items-center gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="voided"
            value="1"
            defaultChecked={search.voided}
            className="size-4 accent-[var(--brand)]"
          />
          {t("showVoided")}
        </label>
        <Button type="submit" variant="secondary" className="lg:col-start-5">
          <Search aria-hidden className="size-4" />
          {t("apply")}
        </Button>
      </form>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-faint">{t("count", { count: data.total })}</p>
        <p className="text-sm font-semibold">
          {t("total")}{" "}
          <Money
            cents={data.totalCents}
            currency={data.currency}
            className="ml-1 text-lg font-bold"
          />
        </p>
      </div>

      {data.rows.length === 0 ? (
        <EmptyState icon={HandCoins} message={t("empty")} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs font-semibold text-ink-faint">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  {t("receivedOn")}
                </th>
                <th scope="col" className="px-4 py-3.5">
                  {data.showNames ? t("giver") : t("fund")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 md:table-cell">
                  {data.showNames ? t("fund") : t("method")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 lg:table-cell">
                  {t("method")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 xl:table-cell">
                  {t("reference")}
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  {t("amount")}
                </th>
                {data.canCapture ? (
                  <th scope="col" className="w-0 px-3 py-3.5">
                    <span className="sr-only">{t("actions")}</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((row) => {
                const giver = name(row);
                const fundName = localized(row.fundName, locale);
                const summary = `${formatMoney(format, row.amountCents, data.currency)} · ${fundName} · ${format.dateTime(new Date(`${row.receivedOn}T12:00:00Z`), { dateStyle: "medium", timeZone: "UTC" })}`;
                return (
                  <tr key={row.id} className={row.voidedAt ? "text-ink-faint" : undefined}>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {format.dateTime(new Date(`${row.receivedOn}T12:00:00Z`), {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">
                        {data.showNames ? (giver ?? t("anonymous")) : fundName}
                      </span>
                      {row.voidedAt ? (
                        <span className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge tone="danger">{t("voidedBadge")}</Badge>
                          <span className="text-xs">{row.voidReason}</span>
                        </span>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                      {data.showNames ? fundName : tm(row.method)}
                    </td>
                    <td className="hidden px-4 py-3 text-ink-soft lg:table-cell">
                      {tm(row.method)}
                      {row.batchId ? (
                        <span className="ml-1.5 text-xs text-ink-faint">· {t("fromCount")}</span>
                      ) : null}
                      {row.bankImportId ? (
                        <span className="ml-1.5 text-xs text-ink-faint">· {t("fromBank")}</span>
                      ) : null}
                    </td>
                    <td className="hidden max-w-48 truncate px-4 py-3 text-ink-soft xl:table-cell">
                      {row.reference ?? "–"}
                    </td>
                    <td
                      className={
                        row.voidedAt
                          ? "px-4 py-3 text-right line-through"
                          : "px-4 py-3 text-right font-semibold"
                      }
                    >
                      <Money cents={row.amountCents} currency={data.currency} />
                    </td>
                    {data.canCapture ? (
                      <td className="px-3 py-2 text-right">
                        {!row.voidedAt && !row.locked ? (
                          <VoidGiftDialog id={row.id} summary={summary} />
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={search.page} pageSize={data.pageSize} total={data.total} href={query} />
    </div>
  );
}
