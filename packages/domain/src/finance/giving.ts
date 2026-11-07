import { z } from "zod";
import { type IsoDate, pastDateSchema } from "./dates";
import { amountSchema } from "./money";

export const GIVING_METHODS = ["cash", "eft", "card", "other"] as const;

export type GivingMethod = (typeof GIVING_METHODS)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const optionalUuid = z
  .union([z.uuid(), z.literal("")])
  .nullish()
  .transform((value) => (value ? value : null));

export const giftInputSchema = (today: IsoDate) =>
  z.object({
    fundId: z.uuid("required"),
    personId: optionalUuid,
    method: z.enum(GIVING_METHODS, "required"),
    amount: amountSchema,
    receivedOn: pastDateSchema(today),
    reference: optionalText(80).prefault(""),
  });

export type GiftInput = z.output<ReturnType<typeof giftInputSchema>>;

export const voidReasonSchema = z.string().trim().min(3, "finance.reasonRequired").max(300);

export const givingNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z.string().regex(/^[A-Z0-9][A-Z0-9-]{0,19}$/, "finance.invalidGivingNumber"),
    ]),
  );

export const donorProfileInputSchema = z.object({
  personId: z.uuid(),
  givingNumber: givingNumberSchema,
  taxNumber: optionalText(40).prefault(""),
  address: optionalText(300).prefault(""),
});

export type DonorProfileInput = z.output<typeof donorProfileInputSchema>;
