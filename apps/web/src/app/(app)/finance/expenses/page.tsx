import { formatExpenseNumber } from "@ecclesia/domain/finance";
import { ChevronRight, Paperclip, Plus, ReceiptText } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { localized } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { ExpenseStatusBadge } from "@/modules/finance/expense-status";
import { Money } from "@/modules/finance/money";
import { type ExpenseView, loadExpenses } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Payment requests" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ExpensesPage({ searchParams }: PageProps) {
  const [data, t, format, locale] = await Promise.all([
    loadExpenses(await searchParams),
    getTranslations("finance.expenses"),
    getFormatter(),
    getLocale(),
  ]);
  const views: ExpenseView[] = data.canApprove
    ? ["awaiting", "approved", "mine", "all"]
    : ["mine", "all"];
  const href = (page: number) => {
    const params = new URLSearchParams({ view: data.view });
    if (page > 1) params.set("page", String(page));
    return `/finance/expenses?${params}`;
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          data.canRequest ? (
            <Link href="/finance/expenses/new" className={buttonClasses("primary")}>
              <Plus aria-hidden className="size-4" />
              {t("new")}
            </Link>
          ) : null
        }
      />
      <nav aria-label={t("viewsLabel")} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="inline-flex gap-1">
          {views.map((view) => (
            <li key={view}>
              <Link
                href={`/finance/expenses?view=${view}` as Route}
                aria-current={data.view === view ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap ring-1 ring-inset transition-colors",
                  data.view === view
                    ? "bg-ink text-canvas ring-transparent"
                    : "text-ink-soft ring-line hover:bg-muted",
                )}
              >
                {t(`views.${view}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {data.rows.length === 0 ? (
        <EmptyState icon={ReceiptText} message={t(`empty.${data.view}`)} />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data.rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/finance/expenses/${row.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors hover:bg-muted"
              >
                <span className="min-w-0 flex-1 basis-full sm:basis-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-ink-faint">
                      {formatExpenseNumber(row.number)}
                    </span>
                    <span className="font-semibold">{row.title}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-ink-faint">
                    {[
                      row.payee,
                      localized(row.categoryName, locale),
                      row.teamName ? localized(row.teamName, locale) : null,
                      t("requestedBy", {
                        name: row.requestedByName ?? "–",
                        date: format.dateTime(row.createdAt, { dateStyle: "medium" }),
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                {row.attachments > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
                    <Paperclip aria-hidden className="size-3.5" />
                    <span className="sr-only">
                      {t("attachmentsCount", { count: row.attachments })}
                    </span>
                    {row.attachments}
                  </span>
                ) : null}
                <ExpenseStatusBadge status={row.status} />
                <Money
                  cents={row.amountCents}
                  currency={data.currency}
                  className="w-28 text-right font-semibold"
                />
                <ChevronRight aria-hidden className="size-4 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={href} />
    </div>
  );
}
