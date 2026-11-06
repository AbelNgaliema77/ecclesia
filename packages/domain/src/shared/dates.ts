export type MonthKey = `${number}-${string}`;

export const toMonthKey = (date: Date): MonthKey => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const lastNMonthKeys = (now: Date, count: number): MonthKey[] => {
  const keys: MonthKey[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    keys.push(toMonthKey(d));
  }
  return keys;
};

export const rangesOverlap = (
  a: { start: Date; end: Date | null },
  b: { start: Date; end: Date | null },
): boolean => {
  const aEnd = a.end?.getTime() ?? Number.POSITIVE_INFINITY;
  const bEnd = b.end?.getTime() ?? Number.POSITIVE_INFINITY;
  return a.start.getTime() < bEnd && b.start.getTime() < aEnd;
};

const offsetMinutes = (instant: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
};

export const zonedDateTimeToUtc = (date: string, time: string, timeZone: string): Date => {
  const naive = new Date(`${date}T${time.slice(0, 5)}:00Z`);
  if (Number.isNaN(naive.getTime())) throw new Error("Invalid date or time");
  const first = offsetMinutes(naive, timeZone);
  const guess = new Date(naive.getTime() - first * 60_000);
  const second = offsetMinutes(guess, timeZone);
  return second === first ? guess : new Date(naive.getTime() - second * 60_000);
};
