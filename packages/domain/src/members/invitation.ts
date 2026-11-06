import { z } from "zod";

export const INVITATION_TTL_DAYS = 14;

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type InvitationState = {
  readonly acceptedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly expiresAt: Date;
};

export const invitationStatus = (state: InvitationState, now: Date): InvitationStatus => {
  if (state.acceptedAt) return "accepted";
  if (state.revokedAt) return "revoked";
  return now.getTime() > state.expiresAt.getTime() ? "expired" : "pending";
};

export const invitationExpiry = (now: Date): Date =>
  new Date(now.getTime() + INVITATION_TTL_DAYS * 86_400_000);

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const emailsMatch = (a: string, b: string): boolean =>
  normalizeEmail(a) === normalizeEmail(b);

export const invitationInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  roleId: z.uuid(),
  personId: z
    .union([z.literal(""), z.uuid()])
    .nullable()
    .optional()
    .transform((value) => value || null),
});

export type InvitationInput = z.output<typeof invitationInputSchema>;
