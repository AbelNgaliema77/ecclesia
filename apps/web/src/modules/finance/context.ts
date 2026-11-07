import "server-only";
import type { Tx } from "@ecclesia/db";
import { finance } from "@ecclesia/db/repositories";
import { ensureOpenPeriod, type IsoDate, todayIn } from "@ecclesia/domain/finance";
import { ActionFailure } from "@/server/action";
import type { ChurchContext } from "@/server/context";

export const churchToday = (context: ChurchContext): IsoDate =>
  todayIn(context.membership.timezone);

export const ensureOpen = async (tx: Tx, ...dates: readonly IsoDate[]) => {
  const closed = await finance.closedMonths(tx);
  for (const date of dates) {
    const check = ensureOpenPeriod(date, closed);
    if (!check.ok) throw new ActionFailure(check.error.code);
  }
};
