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
    services: point.services,
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
      <div className="min-w-48 rounded-panel border border-line bg-surface p-3 text-sm shadow-lg shadow-ink/5">
        <p className="font-medium text-ink">
          {format.dateTime(toDate(label), { month: "long", year: "numeric", timeZone: "UTC" })}
          {point.season ? (
            <span className="ml-2 font-normal text-candle-700">{t(`seasons.${point.season}`)}</span>
          ) : null}
        </p>
        <ul className="mt-2 flex flex-col gap-1">
          {[...categories].reverse().map((c) => (
            <li key={c.id} className="flex items-center gap-2 text-ink-soft">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: c.color }} />
              <span className="flex-1">{localized(c.name, locale)}</span>
              <span className="text-ink">
                {format.number(Number(point[c.id as keyof typeof point] ?? 0))}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 flex justify-between border-t border-line pt-2 font-medium text-ink">
          <span>{t("averageAttendance")}</span>
          <span>{format.number(point.total)}</span>
        </p>
      </div>
    );
  };

  return (
    <figure className="flex flex-col gap-4">
      <div className="h-72 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 24, right: 4, bottom: 0, left: -12 }}
            barCategoryGap="22%"
          >
            <CartesianGrid vertical={false} stroke="#e2e4e0" />
            {seasonBands.map((band) => (
              <ReferenceArea
                key={`${band.season}-${band.from}`}
                x1={band.from}
                x2={band.to}
                fill="#f6ecd6"
                fillOpacity={0.55}
                ifOverflow="extendDomain"
                label={{
                  value: t(`seasons.${band.season}`),
                  position: "insideTop",
                  offset: -18,
                  fill: "#7d5a17",
                  fontSize: 12,
                }}
              />
            ))}
            <XAxis
              dataKey="month"
              tickFormatter={monthLabel}
              tickLine={false}
              axisLine={{ stroke: "#c9ccc6" }}
              tick={{ fill: "#767c85", fontSize: 12 }}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#767c85", fontSize: 12 }}
              width={48}
              allowDecimals={false}
            />
            <Tooltip content={renderTooltip} cursor={{ fill: "#eef6f4", opacity: 0.7 }} />
            {categories.map((c, index) => (
              <Bar
                key={c.id}
                dataKey={c.id}
                stackId="attendance"
                fill={c.color}
                stroke="#ffffff"
                strokeWidth={2}
                radius={index === categories.length - 1 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-soft">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 rounded-sm" style={{ background: c.color }} />
              {localized(c.name, locale)}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
