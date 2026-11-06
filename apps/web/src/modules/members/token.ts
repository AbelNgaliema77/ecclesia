import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const newInvitationToken = (): { token: string; tokenHash: string } => {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
};

export const hashInvitationToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const isWellFormedToken = (token: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(token);
