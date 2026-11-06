import { z } from "zod";
import { localizedTextSchema } from "../shared/localized";
import { PRESET_COLORS } from "../shared/palette";

export const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "CDF", "XAF", "NGN", "KES"] as const;

export const isValidTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export const churchSettingsSchema = z.object({
  name: z.string().trim().min(2, "required").max(120),
  defaultLocale: z.enum(["en", "fr"]),
  timezone: z.string().refine(isValidTimeZone, "invalidTimeZone"),
  currency: z.enum(CURRENCIES),
});

export type ChurchSettingsInput = z.output<typeof churchSettingsSchema>;

const timeOfDay = z
  .union([z.literal(""), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalidTime")])
  .nullable()
  .optional()
  .transform((value) => value || null);

export const serviceTypeSchema = z.object({
  name: localizedTextSchema(60),
  dayOfWeek: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(6)])
    .nullable()
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  startsAt: timeOfDay,
});

export type ServiceTypeInput = z.output<typeof serviceTypeSchema>;

export const categorySchema = z.object({
  name: localizedTextSchema(40),
  color: z.enum(PRESET_COLORS),
});

export type CategoryInput = z.output<typeof categorySchema>;

export const reorder = <T extends { id: string }>(
  items: readonly T[],
  id: string,
  direction: "up" | "down",
): T[] => {
  const index = items.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const current = next[index];
  const swap = next[target];
  if (!current || !swap) return next;
  next[index] = swap;
  next[target] = current;
  return next;
};
