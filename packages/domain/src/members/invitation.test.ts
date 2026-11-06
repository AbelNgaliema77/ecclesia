import { describe, expect, it } from "vitest";
import {
  emailsMatch,
  invitationExpiry,
  invitationInputSchema,
  invitationStatus,
} from "./invitation";

const now = new Date("2026-11-06T12:00:00Z");

describe("invitationStatus", () => {
  const base = { acceptedAt: null, revokedAt: null, expiresAt: invitationExpiry(now) };

  it("is pending until it expires", () => {
    expect(invitationStatus(base, now)).toBe("pending");
    expect(invitationStatus(base, new Date(now.getTime() + 15 * 86_400_000))).toBe("expired");
  });

  it("prefers accepted and revoked over expiry", () => {
    expect(invitationStatus({ ...base, acceptedAt: now }, now)).toBe("accepted");
    expect(invitationStatus({ ...base, revokedAt: now }, now)).toBe("revoked");
  });
});

describe("invitation input", () => {
  it("normalises the email and empty person link", () => {
    const parsed = invitationInputSchema.parse({
      email: " Pastor@LaBorne.org ",
      roleId: "00000000-0000-4000-8000-000000000001",
      personId: "",
    });
    expect(parsed.email).toBe("pastor@laborne.org");
    expect(parsed.personId).toBeNull();
  });

  it("matches emails regardless of case and spacing", () => {
    expect(emailsMatch("A@b.org ", "a@B.org")).toBe(true);
    expect(emailsMatch("a@b.org", "c@b.org")).toBe(false);
  });
});
