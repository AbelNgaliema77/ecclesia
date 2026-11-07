import { domainError, err, ok, type Result } from "../shared/result";
import { type IsoDate, monthOf } from "./dates";

export const ensureOpenPeriod = (
  date: IsoDate,
  closedMonths: ReadonlySet<IsoDate>,
): Result<true> =>
  closedMonths.has(monthOf(date))
    ? err(domainError("finance.periodClosed", "That month is closed", { month: monthOf(date) }))
    : ok(true);

export const canCloseMonth = (month: IsoDate, today: IsoDate): Result<true> =>
  monthOf(month) < monthOf(today)
    ? ok(true)
    : err(domainError("finance.monthNotOver", "A month can only be closed after it ends"));
