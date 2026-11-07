import { useFormatter } from "next-intl";
import { cn } from "@/lib/cn";

type Formatter = ReturnType<typeof useFormatter>;

export const formatMoney = (format: Formatter, cents: number, currency: string, compact = false) =>
  format.number(cents / 100, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    ...(compact
      ? { notation: "compact", maximumFractionDigits: 1 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  });

export function Money({
  cents,
  currency,
  compact = false,
  className,
}: {
  cents: number;
  currency: string;
  compact?: boolean;
  className?: string;
}) {
  const format = useFormatter();
  return (
    <span className={cn("tabular-nums whitespace-nowrap", className)}>
      {formatMoney(format, cents, currency, compact)}
    </span>
  );
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2);
