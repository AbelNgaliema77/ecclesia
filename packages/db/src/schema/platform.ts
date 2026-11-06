import { SUBSCRIPTION_STATUSES } from "@ecclesia/domain/billing";
import { sql } from "drizzle-orm";
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const localeEnum = pgEnum("locale", ["en", "fr"]);

export const subscriptionStatusEnum = pgEnum("subscription_status", SUBSCRIPTION_STATUSES);

export const planEnum = pgEnum("plan", ["starter", "growth", "plus"]);

export type ChurchFeatures = {
  inventory: boolean;
  finance: boolean;
  analytics: boolean;
};

export type ChurchBranding = {
  primaryColor: string | null;
  logoUrl: string | null;
};

export const churches = pgTable("churches", {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`),
  slug: text().notNull().unique(),
  name: text().notNull(),
  defaultLocale: localeEnum().notNull().default("en"),
  currency: text().notNull().default("ZAR"),
  timezone: text().notNull().default("Africa/Johannesburg"),
  features: jsonb()
    .$type<ChurchFeatures>()
    .notNull()
    .default({ inventory: false, finance: false, analytics: true }),
  branding: jsonb()
    .$type<ChurchBranding>()
    .notNull()
    .default({ primaryColor: null, logoUrl: null }),
  isDemo: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  churchId: uuid()
    .primaryKey()
    .references(() => churches.id, { onDelete: "cascade" }),
  plan: planEnum().notNull().default("starter"),
  status: subscriptionStatusEnum().notNull().default("trialing"),
  trialEndsAt: timestamp({ withTimezone: true }),
  pastDueSince: timestamp({ withTimezone: true }),
  cancelledAt: timestamp({ withTimezone: true }),
  providerCustomerRef: text(),
  providerSubscriptionRef: text(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
