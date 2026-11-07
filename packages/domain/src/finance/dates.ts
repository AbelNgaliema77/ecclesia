import { z } from "zod";

export type IsoDate = string;

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isIsoDate = (value: string): boolean => {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const todayIn = (timeZone: string, now: Date = new Date()): IsoDate =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const pastDateSchema = (today: IsoDate) =>
  z
    .string()
    .refine(isIsoDate, "invalidDate")
    .refine((value) => value <= today, "futureDate");

export const monthOf = (date: IsoDate): IsoDate => `${date.slice(0, 7)}-01`;

export const addMonths = (month: IsoDate, count: number): IsoDate => {
  const [year = 0, mon = 1] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + count, 1));
  return d.toISOString().slice(0, 10);
};

export const lastDayOfMonth = (month: IsoDate): IsoDate => {
  const next = addMonths(monthOf(month), 1);
  const d = new Date(`${next}T00:00:00Z`);
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
};

export const monthsBetween = (from: IsoDate, to: IsoDate): IsoDate[] => {
  const months: IsoDate[] = [];
  for (let m = monthOf(from); m <= monthOf(to); m = addMonths(m, 1)) months.push(m);
  return months;
};

export type DateRange = { readonly from: IsoDate; readonly to: IsoDate };

export const dateRangeSchema = z
  .object({
    from: z.string().refine(isIsoDate, "invalidDate"),
    to: z.string().refine(isIsoDate, "invalidDate"),
  })
  .refine((range) => range.from <= range.to, { message: "finance.rangeOrder", path: ["to"] })
  .refine(
    (range) =>
      new Date(`${range.to}T00:00:00Z`).getTime() - new Date(`${range.from}T00:00:00Z`).getTime() <=
      1000 * 60 * 60 * 24 * 366 * 5,
    { message: "finance.rangeTooLong", path: ["to"] },
  );
