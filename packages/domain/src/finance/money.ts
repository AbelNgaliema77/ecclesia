import { z } from "zod";

export const CURRENCIES = [
  "ZAR",
  "USD",
  "EUR",
  "GBP",
  "CDF",
  "XAF",
  "BWP",
  "NAD",
  "MZN",
  "ZMW",
  "KES",
  "NGN",
] as const;

export type Currency = (typeof CURRENCIES)[number];

export const MAX_AMOUNT_CENTS = 1_000_000_000;

const SEPARATORS = /[.,]/g;

const validGroups = (text: string, separator: string): boolean => {
  const groups = text.split(separator);
  return groups.length === 1 || groups.slice(1).every((group) => group.length === 3);
};

const splitDecimal = (text: string): { whole: string; fraction: string } | null => {
  const used = [...new Set(text.match(SEPARATORS) ?? [])];
  if (used.length === 0) return { whole: text, fraction: "" };
  if (used.length === 1) {
    const separator = used[0] ?? ".";
    const parts = text.split(separator);
    const tail = parts[parts.length - 1] ?? "";
    if (parts.length === 2 && tail.length > 0 && tail.length <= 2) {
      return { whole: parts[0] ?? "", fraction: tail };
    }
    return validGroups(text, separator) && (parts[0] ?? "").length > 0
      ? { whole: parts.join(""), fraction: "" }
      : null;
  }
  const decimal = text[text.search(/[.,][^.,]*$/)] ?? ".";
  const thousands = decimal === "." ? "," : ".";
  const [whole = "", fraction = "", ...rest] = text.split(decimal);
  if (rest.length > 0 || whole.length === 0 || !validGroups(whole, thousands)) return null;
  return { whole: whole.split(thousands).join(""), fraction };
};

export const parseSignedAmount = (input: string | number): number | null => {
  if (typeof input === "number") {
    return Number.isFinite(input) ? Math.round(input * 100) : null;
  }
  let text = input.trim().replace(/[\s  ']/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  text = text.replace(/^[A-Za-z$€£₦]+/, "").replace(/[A-Za-z$€£₦]+$/, "");
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.endsWith("-")) {
    negative = !negative;
    text = text.slice(0, -1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  if (!/^\d[\d.,]*$/.test(text) && !/^[.,]\d{1,2}$/.test(text)) return null;
  const parts = splitDecimal(text);
  if (!parts || !/^\d*$/.test(parts.whole) || !/^\d{0,2}$/.test(parts.fraction)) return null;
  const cents = Number(parts.whole || "0") * 100 + Number(parts.fraction.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
};

export const parseAmount = (input: string | number): number | null => {
  const cents = parseSignedAmount(input);
  return cents === null || cents < 0 ? null : cents;
};

export const amountSchema = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const cents = parseAmount(value);
  if (cents === null || cents === 0) {
    ctx.addIssue({ code: "custom", message: "finance.invalidAmount" });
    return z.NEVER;
  }
  if (cents > MAX_AMOUNT_CENTS) {
    ctx.addIssue({ code: "custom", message: "finance.amountTooLarge" });
    return z.NEVER;
  }
  return cents;
});

export const optionalAmountSchema = z.union([z.string(), z.number()]).transform((value, ctx) => {
  if (value === "") return 0;
  const cents = parseAmount(value);
  if (cents === null) {
    ctx.addIssue({ code: "custom", message: "finance.invalidAmount" });
    return z.NEVER;
  }
  if (cents > MAX_AMOUNT_CENTS) {
    ctx.addIssue({ code: "custom", message: "finance.amountTooLarge" });
    return z.NEVER;
  }
  return cents;
});

export const centsToDecimal = (cents: number): string => {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
};

export const centsToUnits = (cents: number): number => cents / 100;

export const sumCents = (values: readonly { readonly amountCents: number }[]): number =>
  values.reduce((total, value) => total + value.amountCents, 0);
