"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { localized } from "@/i18n/config";
import type { TrendPoint } from "./queries";

type Category = { id: string; name: { en: string; fr: string }; color: string };

type ChartProps = {
  trend: readonly TrendPoint[];
  categories: readonly Category[];
};

const toDate = (month: string) => new Date(`${month}-15T12:00:00Z`);

export function AttendanceTrendChart({ trend, categories }: ChartProps) {
  const format = useFormatter();
  const locale = useLocale();
  const t = useTranslations("dashboard");

  const data = trend.map((point) => ({
    month: point.month,
    season: point.season,
    total: point.averagePerService,
    ...point.byCategory,
  }));

  const seasonBands: { season: NonNullable<TrendPoint["season"]>; from: string; to: string }[] = [];
  trend.forEach((point, index) => {
    if (!point.season) return;
    const last = seasonBands.at(-1);
    if (last && last.season === point.season && trend[index - 1]?.season === point.season) {
      last.to = point.month;
    } else {
      seasonBands.push({ season: point.season, from: point.month, to: point.month });
    }
  });

  const monthLabel = (month: string) =>
    format.dateTime(toDate(month), { month: "short", timeZone: "UTC" });

  const renderTooltip = ({ active, payload, label }: TooltipContentProps<ValueType, NameType>) => {
    if (!active || !payload?.length || typeof label !== "string") return null;
    const point = data.find((d) => d.month === label);
    if (!point) return null;
    return (
      <div className="min-w-52 rounded-card border border-line bg-surface p-4 text-sm shadow-pop">
        <p className="font-semibold text-ink">
          {format.dateTime(toDate(label), { month: "long", year: "numeric", timeZone: "UTC" })}
        </p>
        {point.season ? (
          <p className="mt-0.5 text-xs font-semibold text-gold-ink">
            {t(`seasons.${point.season}`)}
          </p>
        ) : null}
        <ul className="mt-3 flex flex-col gap-1.5">
          {[...categories].reverse().map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-ink-soft">
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: c.color }} />
              <span className="flex-1">{localized(c.name, locale)}</span>
              <span className="font-semibold text-ink">
                {format.number(Number(point[c.id as keyof typeof point] ?? 0))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex justify-between border-t border-line pt-2.5 font-semibold text-ink">
          <span>{t("averageAttendance")}</span>
          <span>{format.number(point.total)}</span>
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
            margin={{ top: 28, right: 0, bottom: 0, left: -16 }}
            barCategoryGap="26%"
          >
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="4 6" />
            {seasonBands.map((band) => (
              <ReferenceArea
                key={`${band.season}-${band.from}`}
                x1={band.from}
                x2={band.to}
                fill="var(--gold-soft)"
                fillOpacity={0.7}
                ifOverflow="extendDomain"
                radius={10}
                label={{
                  value: t(`seasons.${band.season}`),
                  position: "insideTop",
                  offset: -20,
                  fill: "var(--gold-ink)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
            ))}
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
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
              width={48}
              allowDecimals={false}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: "var(--muted)", radius: 10 }} />
            {categories.map((c, index) => (
              <Bar
                key={c.id}
                dataKey={c.id}
                stackId="attendance"
                fill={c.color}
                stroke="var(--chart-gap)"
                strokeWidth={2}
                radius={index === categories.length - 1 ? [8, 8, 0, 0] : 0}
                animationDuration={700}
                animationBegin={index * 60}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="inline-flex h-8 items-center gap-2 rounded-full bg-muted px-3 text-sm font-medium text-ink-soft"
            >
              <span aria-hidden className="size-2.5 rounded-full" style={{ background: c.color }} />
              {localized(c.name, locale)}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
