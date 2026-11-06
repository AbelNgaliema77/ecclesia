export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "pastDue",
  "cancelled",
  "comped",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type AccessLevel = "full" | "readOnly" | "locked";

export const GRACE_DAYS = 7;
export const READ_ONLY_UNTIL_DAYS = 30;

export type SubscriptionState = {
  readonly status: SubscriptionStatus;
  readonly trialEndsAt: Date | null;
  readonly pastDueSince: Date | null;
  readonly cancelledAt: Date | null;
};

const DAY_MS = 86_400_000;

const daysSince = (from: Date, now: Date): number => (now.getTime() - from.getTime()) / DAY_MS;

export const accessLevel = (state: SubscriptionState, now: Date): AccessLevel => {
  switch (state.status) {
    case "active":
    case "comped":
      return "full";
    case "trialing":
      return state.trialEndsAt !== null && now.getTime() > state.trialEndsAt.getTime()
        ? "readOnly"
        : "full";
    case "pastDue": {
      if (state.pastDueSince === null) return "full";
      const days = daysSince(state.pastDueSince, now);
      if (days <= GRACE_DAYS) return "full";
      if (days <= READ_ONLY_UNTIL_DAYS) return "readOnly";
      return "locked";
    }
    case "cancelled":
      return "locked";
  }
};
