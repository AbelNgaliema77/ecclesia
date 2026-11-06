import { z } from "zod";
import { domainError, err, ok, type Result } from "../shared/result";

export const PERSON_STATUSES = [
  "visitor",
  "regular",
  "member",
  "worker",
  "leader",
  "inactive",
] as const;

export type PersonStatus = (typeof PERSON_STATUSES)[number];

export const GENDERS = ["male", "female"] as const;

export type Gender = (typeof GENDERS)[number];

const ALLOWED_TRANSITIONS: Record<PersonStatus, readonly PersonStatus[]> = {
  visitor: ["regular", "member", "inactive"],
  regular: ["member", "inactive"],
  member: ["worker", "regular", "inactive"],
  worker: ["leader", "member", "inactive"],
  leader: ["worker", "member", "inactive"],
  inactive: ["regular", "member"],
};

export const canTransition = (from: PersonStatus, to: PersonStatus): boolean =>
  from === to || ALLOWED_TRANSITIONS[from].includes(to);

export const transitionStatus = (from: PersonStatus, to: PersonStatus): Result<PersonStatus> =>
  canTransition(from, to)
    ? ok(to)
    : err(
        domainError("person.invalidStatusTransition", `Cannot move from ${from} to ${to}`, {
          from,
          to,
        }),
      );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const personInputSchema = z.object({
  firstName: z.string().trim().min(1, "required").max(80),
  lastName: z.string().trim().min(1, "required").max(80),
  preferredName: optionalText(80),
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
  status: z.enum(PERSON_STATUSES).default("visitor"),
  firstVisitOn: z.coerce
    .date()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  householdId: z
    .uuid()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  notes: optionalText(2000),
});

export type PersonInput = z.input<typeof personInputSchema>;
export type ValidPerson = z.output<typeof personInputSchema>;

export const displayName = (person: {
  firstName: string;
  lastName: string;
  preferredName?: string | null;
}): string => `${person.preferredName ?? person.firstName} ${person.lastName}`;

export const initials = (person: { firstName: string; lastName: string }): string =>
  `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
