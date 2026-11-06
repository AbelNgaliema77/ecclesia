import { describe, expect, it } from "vitest";
import { accessLevel, type SubscriptionState } from "./subscription";

const now = new Date("2026-11-06T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

const state = (overrides: Partial<SubscriptionState>): SubscriptionState => ({
  status: "active",
  trialEndsAt: null,
  pastDueSince: null,
  cancelledAt: null,
  ...overrides,
});

describe("accessLevel", () => {
  it("gives full access to active and comped churches", () => {
    expect(accessLevel(state({}), now)).toBe("full");
    expect(accessLevel(state({ status: "comped" }), now)).toBe("full");
  });

  it("makes an expired trial read-only", () => {
    expect(accessLevel(state({ status: "trialing", trialEndsAt: daysAgo(-3) }), now)).toBe("full");
    expect(accessLevel(state({ status: "trialing", trialEndsAt: daysAgo(1) }), now)).toBe(
      "readOnly",
    );
  });

  it("steps down from grace to read-only to locked when payment fails", () => {
    expect(accessLevel(state({ status: "pastDue", pastDueSince: daysAgo(3) }), now)).toBe("full");
    expect(accessLevel(state({ status: "pastDue", pastDueSince: daysAgo(10) }), now)).toBe(
      "readOnly",
    );
    expect(accessLevel(state({ status: "pastDue", pastDueSince: daysAgo(31) }), now)).toBe(
      "locked",
    );
  });

  it("locks cancelled churches", () => {
    expect(accessLevel(state({ status: "cancelled", cancelledAt: daysAgo(1) }), now)).toBe(
      "locked",
    );
  });
});
