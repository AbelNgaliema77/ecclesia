import { z } from "zod";

export const GENDERS = ["male", "female"] as const;

export type Gender = (typeof GENDERS)[number];

export const PEOPLE_FILTERS = ["serving", "leaders", "unassigned"] as const;

export type PeopleFilter = (typeof PEOPLE_FILTERS)[number];

export const EARLIEST_JOINED_YEAR = 1900;

export const personInputSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(80),
  lastName: z.string().trim().min(1, "required").max(80),
  gender: z
    .enum(GENDERS)
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  email: z
    .union([z.literal(""), z.email().max(254)])
    .nullable()
    .optional()
    .transform((value) => (value ? value.toLowerCase() : null)),
  phone: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^\+?[0-9 ()-]{7,20}$/, "invalidPhone"),
    ])
    .nullable()
    .optional()
    .transform((value) => (value ? value.replace(/[ ()-]/g, "") : null)),
  dateOfBirth: z.coerce
    .date()
    .max(new Date(), "futureDate")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  joinedYear: z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.coerce
      .number()
      .int("invalidYear")
      .min(EARLIEST_JOINED_YEAR, "invalidYear")
      .refine((year) => year <= new Date().getUTCFullYear(), "futureYear")
      .nullable(),
  ),
});

export type PersonInput = z.input<typeof personInputSchema>;
export type ValidPerson = z.output<typeof personInputSchema>;

export const displayName = (person: { firstName: string; lastName: string }): string =>
  `${person.firstName} ${person.lastName}`;

export const initials = (person: { firstName: string; lastName: string }): string =>
  `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
