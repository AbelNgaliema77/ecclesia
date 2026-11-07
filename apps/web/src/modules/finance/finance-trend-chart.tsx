"use client";

import { useFormatter, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { formatMoney } from "./money";

export const INCOME_COLOR = "#3987e5";
export const EXPENSE_COLOR = "#d95926";

type Point = {
  readonly month: string;
  readonly incomeCents: number;
  readonly expenseCents: number;
};

const toDate = (month: string) => new Date(`${month}-15T12:00:00Z`);

export function FinanceTrendChart({
  trend,
  currency,
}: {
  trend: readonly Point[];
  currency: string;
}) {
  const format = useFormatter();
  const t = useTranslations("finance.overview");
  const data = trend.map((point) => ({
    month: point.month,
    income: point.incomeCents / 100,
    expenses: point.expenseCents / 100,
  }));

  const renderTooltip = ({ active, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || typeof label !== "string") return null;
    const point = trend.find((d) => d.month === label);
    if (!point) return null;
    const net = point.incomeCents - point.expenseCents;
    return (
      <div className="min-w-56 rounded-card border border-line bg-surface p-4 text-sm shadow-pop">
        <p className="font-semibold text-ink">
          {format.dateTime(toDate(label), { month: "long", year: "numeric", timeZone: "UTC" })}
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {(
            [
              ["income", INCOME_COLOR, point.incomeCents],
              ["expenses", EXPENSE_COLOR, point.expenseCents],
            ] as const
          ).map(([key, color, cents]) => (
            <li key={key} className="flex items-center gap-2 text-ink-soft">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
              <span className="flex-1">{t(key)}</span>
              <span className="font-semibold text-ink tabular-nums">
                {formatMoney(format, cents, currency)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between gap-4 border-t border-line pt-2.5 font-semibold text-ink">
          <span>{t("net")}</span>
          <span className={net < 0 ? "text-danger tabular-nums" : "tabular-nums"}>
            {formatMoney(format, net, currency)}
          </span>
        </p>
      </div>
    );
  };

  return (
    <figure className="flex flex-col gap-5">
      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 0, bottom: 0, left: 4 }}
            barCategoryGap="22%"
            barGap={3}
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 6" />
            <XAxis
              dataKey="month"
              tickFormatter={(month: string) =>
                format.dateTime(toDate(month), { month: "short", timeZone: "UTC" })
              }
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              interval="equidistantPreserveStart"
              minTickGap={8}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
              width={64}
              tickFormatter={(value: number) => formatMoney(format, value * 100, currency, true)}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: "var(--muted)", radius: 10 }} />
            <Bar
              dataKey="income"
              fill={INCOME_COLOR}
              radius={[6, 6, 0, 0]}
              animationDuration={700}
            />
            <Bar
              dataKey="expenses"
              fill={EXPENSE_COLOR}
              radius={[6, 6, 0, 0]}
              animationDuration={700}
              animationBegin={80}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-2">
          {(
            [
              ["income", INCOME_COLOR],
              ["expenses", EXPENSE_COLOR],
            ] as const
          ).map(([key, color]) => (
            <li
              key={key}
              className="inline-flex h-8 items-center gap-2 rounded-full bg-muted px-3 text-sm font-medium text-ink-soft"
            >
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />
              {t(key)}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
