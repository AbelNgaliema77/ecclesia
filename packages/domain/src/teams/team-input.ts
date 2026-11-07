import { z } from "zod";
import { localizedTextSchema } from "../shared/localized";
import { PRESET_COLORS } from "../shared/palette";

export const teamInputSchema = z.object({
  name: localizedTextSchema(60),
  description: z
    .string()
    .trim()
    .max(280)
    .optional()
    .transform((value) => value || null),
  color: z.enum(PRESET_COLORS),
});

export type TeamInput = z.output<typeof teamInputSchema>;

export const positionInputSchema = z.object({
  name: localizedTextSchema(60),
  isLeadership: z
    .union([z.boolean(), z.literal("on"), z.literal("")])
    .optional()
    .transform((value) => value === true || value === "on"),
  maxHolders: z
    .union([z.literal(""), z.coerce.number().int().min(1).max(500)])
    .nullable()
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
});

export type PositionInput = z.output<typeof positionInputSchema>;

export const assignmentInputSchema = z.object({
  personId: z.uuid(),
  positionId: z.uuid(),
  startsOn: z.iso.date().transform((value) => new Date(`${value}T00:00:00Z`)),
});

const isoDay = z.iso.date().transform((value) => new Date(`${value}T00:00:00Z`));

export const endAssignmentInputSchema = z.object({
  assignmentId: z.uuid(),
  from: isoDay,
});

export const handOverInputSchema = z.object({
  assignmentId: z.uuid(),
  personId: z.uuid(),
  from: isoDay,
});
