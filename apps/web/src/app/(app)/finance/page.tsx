import { percentChange } from "@ecclesia/domain/shared";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  ClipboardCheck,
  HandCoins,
  ReceiptText,
} from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { localized } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { visibleFinanceTabs } from "@/modules/finance/access";
import { BudgetBar } from "@/modules/finance/budget-bar";
import { FinanceTrendChart } from "@/modules/finance/finance-trend-chart";
import { formatMoney } from "@/modules/finance/money";
import { loadFinanceOverview } from "@/modules/finance/queries";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Finance" };

export default async function FinanceOverviewPage() {
  const context = await getChurchContext();
  const tabs = visibleFinanceTabs(context.actor);
  if (!tabs.some((tab) => tab.key === "overview")) {
    const target = tabs[0];
    if (target) redirect(target.href);
    return null;
  }
  const [data, t, format, locale] = await Promise.all([
    loadFinanceOverview(),
    getTranslations("finance.overview"),
    getFormatter(),
    getLocale(),
  ]);
  const money = (cents: number) => formatMoney(format, cents, data.currency);
  const monthName = format.dateTime(new Date(`${data.today.slice(0, 7)}-15T12:00:00Z`), {
    month: "long",
    timeZone: "UTC",
  });

  const change =
    data.stats?.thisMonth && data.stats.lastYear
      ? percentChange(data.stats.lastYear.totalCents, data.stats.thisMonth.totalCents)
      : null;

  const todo = [
    ...(data.awaitingVerification.length > 0
      ? [
          {
            href: `/finance/counts/${data.awaitingVerification[0]?.id}`,
            icon: ClipboardCheck,
            label: t("todo.verify", { count: data.awaitingVerification.length }),
          },
        ]
      : []),
    ...(data.pending && data.pending.awaitingApproval > 0
      ? [
          {
            href: "/finance/expenses?view=awaiting",
            icon: ReceiptText,
            label: t("todo.approve", { count: data.pending.awaitingApproval }),
          },
        ]
      : []),
    ...(data.pending && data.pending.awaitingPayment > 0
      ? [
          {
            href: "/finance/expenses?view=approved",
            icon: HandCoins,
            label: t("todo.pay", {
              count: data.pending.awaitingPayment,
              amount: money(data.pending.approvedCents),
            }),
          },
        ]
      : []),
    ...(data.drafts.length > 0
      ? [
          {
            href: `/finance/counts/${data.drafts[0]?.id}`,
            icon: ClipboardCheck,
            label: t("todo.drafts", { count: data.drafts.length }),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      {data.stats ? (
        <section className="hero relative overflow-hidden rounded-hero p-6 sm:p-8">
          <p className="text-sm font-medium text-hero-ink-soft">
            {t("heroLabel", { month: monthName })}
          </p>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="font-display text-[2.5rem] leading-none font-bold sm:text-[3.5rem]">
              {money(data.stats.thisMonth?.totalCents ?? 0)}
            </span>
            {change !== null ? (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-2.5 py-1 text-sm font-bold",
                  change >= 0 ? "bg-[#34c38a]/25 text-[#b8f5d6]" : "bg-[#f2796d]/25 text-[#ffd0ca]",
                )}
              >
                {change >= 0 ? (
                  <ArrowUpRight aria-hidden className="size-4" />
                ) : (
                  <ArrowDownRight aria-hidden className="size-4" />
                )}
                {format.number(Math.abs(change), { maximumFractionDigits: 1 })}%
                <span className="sr-only">{t("vsLastYear")}</span>
              </span>
            ) : null}
          </p>
          <p className="mt-2 text-sm text-hero-ink-soft">{t("heroLead")}</p>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3">
            <div className="glass rounded-card p-3 sm:p-5">
              <p className="text-xs font-medium text-hero-ink-soft sm:text-sm">{t("lastMonth")}</p>
              <p className="mt-2 font-display text-xl font-bold sm:text-[1.75rem]">
                {money(data.stats.lastMonth?.totalCents ?? 0)}
              </p>
            </div>
            <div className="glass rounded-card p-3 sm:p-5">
              <p className="text-xs font-medium text-hero-ink-soft sm:text-sm">{t("givers")}</p>
              <p className="mt-2 font-display text-xl font-bold sm:text-[1.75rem]">
                {format.number(data.stats.thisMonth?.givers ?? 0)}
              </p>
              <p className="mt-1 text-xs text-hero-ink-soft">
                {t("firstTime", { count: data.stats.thisMonth?.firstTimeGivers ?? 0 })}
              </p>
            </div>
            <div className="glass col-span-2 rounded-card p-3 sm:col-span-1 sm:p-5">
              <p className="text-xs font-medium text-hero-ink-soft sm:text-sm">
                {t("sameMonthLastYear")}
              </p>
              <p className="mt-2 font-display text-xl font-bold sm:text-[1.75rem]">
                {money(data.stats.lastYear?.totalCents ?? 0)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          {data.stats ? (
            <section className="card p-5 sm:p-6">
              <h2 className="text-xl font-bold">{t("trendTitle")}</h2>
              <p className="mt-1 mb-5 text-sm text-ink-soft">{t("trendLead")}</p>
              <FinanceTrendChart trend={data.trend} currency={data.currency} />
            </section>
          ) : null}

          {data.budget ? (
            <section className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-xl font-bold">
                  {t("budgetTitle", { year: data.budget.year })}
                </h2>
                <Link
                  href="/finance/budgets"
                  className="text-sm font-semibold text-accent hover:underline"
                >
                  {t("budgetLink")}
                </Link>
              </div>
              {data.budget.rows.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">{t("noBudget")}</p>
              ) : (
                <ul className="mt-5 flex flex-col gap-4">
                  {data.budget.rows.slice(0, 6).map((row) => {
                    const category = data.budget?.categories.find((c) => c.id === row.categoryId);
                    return (
                      <li key={row.categoryId}>
                        <BudgetBar
                          label={category ? localized(category.name, locale) : ""}
                          row={row}
                          currency={data.currency}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">{t("todoTitle")}</h2>
            {todo.length === 0 ? (
              <p className="mt-2 text-sm text-ink-soft">{t("todoEmpty")}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {todo.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href as Route}
                      className="flex items-center gap-3 rounded-control border border-line p-3.5 text-sm font-semibold transition-colors hover:bg-muted"
                    >
                      <item.icon aria-hidden className="size-4 shrink-0 text-brand-soft-ink" />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight aria-hidden className="size-4 text-ink-faint" />
                    </Link>
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
