import { z } from "zod";
import { localizedTextSchema } from "../shared/localized";

export const fundCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{1,15}$/, "finance.invalidFundCode"));

export const fundInputSchema = z.object({
  name: localizedTextSchema(60),
  code: fundCodeSchema,
  taxDeductible: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export type FundInput = z.output<typeof fundInputSchema>;

export const expenseCategoryInputSchema = z.object({
  name: localizedTextSchema(60),
  isActive: z.boolean().default(true),
});

export type ExpenseCategoryInput = z.output<typeof expenseCategoryInputSchema>;

export const DEFAULT_FUNDS: readonly (FundInput & { readonly sortOrder: number })[] = [
  {
    code: "TITHE",
    name: { en: "Tithe", fr: "Dîme" },
    taxDeductible: true,
    isActive: true,
    sortOrder: 0,
  },
  {
    code: "OFFERING",
    name: { en: "Offering", fr: "Offrande" },
    taxDeductible: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: "BUILDING",
    name: { en: "Building fund", fr: "Fonds de construction" },
    taxDeductible: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: "MISSIONS",
    name: { en: "Missions", fr: "Missions" },
    taxDeductible: true,
    isActive: true,
    sortOrder: 3,
  },
];

export const DEFAULT_EXPENSE_CATEGORIES: readonly (ExpenseCategoryInput & {
  readonly sortOrder: number;
})[] = [
  { name: { en: "Rent and utilities", fr: "Loyer et charges" }, isActive: true, sortOrder: 0 },
  {
    name: { en: "Salaries and honoraria", fr: "Salaires et honoraires" },
    isActive: true,
    sortOrder: 1,
  },
  {
    name: { en: "Ministry and events", fr: "Ministère et événements" },
    isActive: true,
    sortOrder: 2,
  },
  { name: { en: "Equipment", fr: "Équipement" }, isActive: true, sortOrder: 3 },
  { name: { en: "Maintenance", fr: "Entretien" }, isActive: true, sortOrder: 4 },
  {
    name: { en: "Outreach and missions", fr: "Évangélisation et missions" },
    isActive: true,
    sortOrder: 5,
  },
  { name: { en: "Administration", fr: "Administration" }, isActive: true, sortOrder: 6 },
];
