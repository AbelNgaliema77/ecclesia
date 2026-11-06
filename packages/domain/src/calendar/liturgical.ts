import type { MonthKey } from "../shared/dates";

export type Season = "lent" | "easter" | "advent";

const DAY_MS = 86_400_000;

export const easterSunday = (year: number): Date => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
};

const firstSundayOfAdvent = (year: number): Date => {
  const christmas = new Date(Date.UTC(year, 11, 25));
  const offset = christmas.getUTCDay() === 0 ? 7 : christmas.getUTCDay();
  return new Date(christmas.getTime() - (offset + 21) * DAY_MS);
};

export const seasonRanges = (year: number): { season: Season; start: Date; end: Date }[] => {
  const easter = easterSunday(year);
  return [
    {
      season: "lent",
      start: new Date(easter.getTime() - 46 * DAY_MS),
      end: new Date(easter.getTime() - DAY_MS),
    },
    { season: "easter", start: easter, end: new Date(easter.getTime() + 49 * DAY_MS) },
    { season: "advent", start: firstSundayOfAdvent(year), end: new Date(Date.UTC(year, 11, 24)) },
  ];
};

const MIN_DAYS_IN_MONTH = 10;

export const seasonForMonth = (month: MonthKey): Season | null => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const monthStart = Date.UTC(year, monthIndex, 1);
  const monthEnd = Date.UTC(year, monthIndex + 1, 0);

  let best: { season: Season; days: number } | null = null;
  for (const range of seasonRanges(year)) {
    const start = Math.max(monthStart, range.start.getTime());
    const end = Math.min(monthEnd, range.end.getTime());
    if (end < start) continue;
    const days = Math.round((end - start) / DAY_MS) + 1;
    if (days >= MIN_DAYS_IN_MONTH && (best === null || days > best.days)) {
      best = { season: range.season, days };
    }
  }
  return best?.season ?? null;
};
