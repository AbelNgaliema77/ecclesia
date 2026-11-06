import { z } from "zod";
import { type MonthKey, toMonthKey } from "../shared/dates";
import { percentChange } from "../shared/percent";

export const MAX_HEADCOUNT = 100_000;

export const headcountEntrySchema = z.object({
  categoryId: z.uuid(),
  count: z.coerce.number().int("wholeNumber").min(0, "negative").max(MAX_HEADCOUNT),
});

export const headcountSubmissionSchema = z
  .object({
    serviceId: z.uuid(),
    entries: z.array(headcountEntrySchema).min(1),
  })
  .refine(
    (value) => new Set(value.entries.map((e) => e.categoryId)).size === value.entries.length,
    { message: "duplicateCategory", path: ["entries"] },
  );

export type HeadcountSubmission = z.output<typeof headcountSubmissionSchema>;

export type HeadcountRecord = {
  readonly occurredAt: Date;
  readonly categoryId: string;
  readonly count: number;
};

export type MonthlyAttendance = {
  readonly month: MonthKey;
  readonly total: number;
  readonly byCategory: Readonly<Record<string, number>>;
  readonly services: number;
  readonly averagePerService: number;
};

export const totalOf = (entries: readonly { count: number }[]): number =>
  entries.reduce((sum, entry) => sum + entry.count, 0);

export const summarizeByMonth = (
  records: readonly (HeadcountRecord & { readonly serviceId: string })[],
  months: readonly MonthKey[],
): MonthlyAttendance[] => {
  const buckets = new Map<
    MonthKey,
    { total: number; byCategory: Record<string, number>; services: Set<string> }
  >(months.map((m) => [m, { total: 0, byCategory: {}, services: new Set() }]));

  for (const record of records) {
    const bucket = buckets.get(toMonthKey(record.occurredAt));
    if (!bucket) continue;
    bucket.total += record.count;
    bucket.byCategory[record.categoryId] =
      (bucket.byCategory[record.categoryId] ?? 0) + record.count;
    bucket.services.add(record.serviceId);
  }

  return months.map((month) => {
    const bucket = buckets.get(month) ?? { total: 0, byCategory: {}, services: new Set<string>() };
    const services = bucket.services.size;
    return {
      month,
      total: bucket.total,
      byCategory: bucket.byCategory,
      services,
      averagePerService: services === 0 ? 0 : Math.round(bucket.total / services),
    };
  });
};

export const monthOverMonth = (series: readonly MonthlyAttendance[]): number | null => {
  const current = series.at(-1);
  const previous = series.at(-2);
  if (!current || !previous) return null;
  return percentChange(previous.averagePerService, current.averagePerService);
};
