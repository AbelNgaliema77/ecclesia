export const weekdayName = (
  day: number,
  locale: string,
  style: "long" | "short" = "long",
): string =>
  new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" }).format(
    new Date(Date.UTC(2023, 0, 1 + day)),
  );

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
