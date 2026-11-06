import type { Grant } from "@ecclesia/domain/access";
import { GENDERS, PERSON_STATUSES } from "@ecclesia/domain/people";
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { churches } from "./platform";

export const personStatusEnum = pgEnum("person_status", PERSON_STATUSES);
export const genderEnum = pgEnum("gender", GENDERS);

const id = () => uuid().primaryKey().default(sql`gen_random_uuid()`);

const churchId = () =>
  uuid()
    .notNull()
    .references(() => churches.id, { onDelete: "cascade" });

const timestamps = () => ({
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type LocalizedText = { en: string; fr: string };

export const roles = pgTable(
  "roles",
  {
    id: id(),
    churchId: churchId(),
    key: text(),
    name: jsonb().$type<LocalizedText>().notNull(),
    grants: jsonb().$type<Grant[]>().notNull().default([]),
    isSystem: boolean().notNull().default(false),
    ...timestamps(),
  },
  (t) => [unique().on(t.churchId, t.id), unique().on(t.churchId, t.key)],
);

export const campuses = pgTable(
  "campuses",
  {
    id: id(),
    churchId: churchId(),
    name: text().notNull(),
    address: text(),
    isPrimary: boolean().notNull().default(false),
    ...timestamps(),
  },
  (t) => [unique().on(t.churchId, t.id)],
);

export const households = pgTable(
  "households",
  {
    id: id(),
    churchId: churchId(),
    name: text().notNull(),
    ...timestamps(),
  },
  (t) => [unique().on(t.churchId, t.id)],
);

export const people = pgTable(
  "people",
  {
    id: id(),
    churchId: churchId(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    preferredName: text(),
    gender: genderEnum(),
    email: text(),
    phone: text(),
    dateOfBirth: date({ mode: "date" }),
    status: personStatusEnum().notNull().default("visitor"),
    firstVisitOn: date({ mode: "date" }),
    householdId: uuid(),
    notes: text(),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    index().on(t.churchId, t.lastName, t.firstName),
    index().on(t.churchId, t.status),
    foreignKey({
      columns: [t.churchId, t.householdId],
      foreignColumns: [households.churchId, households.id],
    }).onDelete("no action"),
  ],
);

export const personStatusHistory = pgTable(
  "person_status_history",
  {
    id: id(),
    churchId: churchId(),
    personId: uuid().notNull(),
    fromStatus: personStatusEnum(),
    toStatus: personStatusEnum().notNull(),
    changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    changedBy: text().references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index().on(t.churchId, t.personId),
    foreignKey({
      columns: [t.churchId, t.personId],
      foreignColumns: [people.churchId, people.id],
    }).onDelete("cascade"),
  ],
);

export const teams = pgTable(
  "teams",
  {
    id: id(),
    churchId: churchId(),
    name: jsonb().$type<LocalizedText>().notNull(),
    description: text(),
    parentTeamId: uuid(),
    color: text(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    foreignKey({
      columns: [t.churchId, t.parentTeamId],
      foreignColumns: [t.churchId, t.id],
    }).onDelete("no action"),
  ],
);

export const positions = pgTable(
  "positions",
  {
    id: id(),
    churchId: churchId(),
    teamId: uuid().notNull(),
    name: jsonb().$type<LocalizedText>().notNull(),
    isLeadership: boolean().notNull().default(false),
    maxHolders: integer(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    foreignKey({
      columns: [t.churchId, t.teamId],
      foreignColumns: [teams.churchId, teams.id],
    }).onDelete("cascade"),
    check("positions_max_holders_positive", sql`${t.maxHolders} IS NULL OR ${t.maxHolders} > 0`),
  ],
);

export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    churchId: churchId(),
    personId: uuid().notNull(),
    positionId: uuid().notNull(),
    startsOn: date({ mode: "date" }).notNull(),
    endsOn: date({ mode: "date" }),
    ...timestamps(),
  },
  (t) => [
    index().on(t.churchId, t.personId),
    index().on(t.churchId, t.positionId),
    foreignKey({
      columns: [t.churchId, t.personId],
      foreignColumns: [people.churchId, people.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.churchId, t.positionId],
      foreignColumns: [positions.churchId, positions.id],
    }).onDelete("cascade"),
    check("assignments_dates_valid", sql`${t.endsOn} IS NULL OR ${t.endsOn} >= ${t.startsOn}`),
  ],
);

export const attendanceCategories = pgTable(
  "attendance_categories",
  {
    id: id(),
    churchId: churchId(),
    name: jsonb().$type<LocalizedText>().notNull(),
    color: text().notNull(),
    sortOrder: smallint().notNull().default(0),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [unique().on(t.churchId, t.id)],
);

export const serviceTypes = pgTable(
  "service_types",
  {
    id: id(),
    churchId: churchId(),
    campusId: uuid(),
    name: jsonb().$type<LocalizedText>().notNull(),
    dayOfWeek: smallint(),
    startsAt: time(),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    foreignKey({
      columns: [t.churchId, t.campusId],
      foreignColumns: [campuses.churchId, campuses.id],
    }).onDelete("no action"),
    check("service_types_day_valid", sql`${t.dayOfWeek} IS NULL OR ${t.dayOfWeek} BETWEEN 0 AND 6`),
  ],
);

export const services = pgTable(
  "services",
  {
    id: id(),
    churchId: churchId(),
    serviceTypeId: uuid().notNull(),
    occursAt: timestamp({ withTimezone: true }).notNull(),
    title: text(),
    notes: text(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    unique().on(t.churchId, t.serviceTypeId, t.occursAt),
    index().on(t.churchId, t.occursAt),
    foreignKey({
      columns: [t.churchId, t.serviceTypeId],
      foreignColumns: [serviceTypes.churchId, serviceTypes.id],
    }).onDelete("restrict"),
  ],
);

export const headcounts = pgTable(
  "headcounts",
  {
    id: id(),
    churchId: churchId(),
    serviceId: uuid().notNull(),
    categoryId: uuid().notNull(),
    count: integer().notNull(),
    capturedBy: text().references(() => user.id, { onDelete: "set null" }),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.serviceId, t.categoryId),
    foreignKey({
      columns: [t.churchId, t.serviceId],
      foreignColumns: [services.churchId, services.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.churchId, t.categoryId],
      foreignColumns: [attendanceCategories.churchId, attendanceCategories.id],
    }).onDelete("restrict"),
    check("headcounts_count_valid", sql`${t.count} >= 0 AND ${t.count} <= 100000`),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    churchId: churchId(),
    actorUserId: text(),
    action: text().notNull(),
    entityType: text().notNull(),
    entityId: text(),
    before: jsonb(),
    after: jsonb(),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.churchId, t.occurredAt), index().on(t.churchId, t.entityType, t.entityId)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    churchId: churchId(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: uuid().notNull(),
    personId: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.churchId, t.userId),
    index().on(t.userId),
    foreignKey({
      columns: [t.churchId, t.roleId],
      foreignColumns: [roles.churchId, roles.id],
    }).onDelete("restrict"),
    foreignKey({
      columns: [t.churchId, t.personId],
      foreignColumns: [people.churchId, people.id],
    }).onDelete("no action"),
  ],
);

export const CHURCH_SCOPED_TABLES = [
  "roles",
  "campuses",
  "households",
  "people",
  "person_status_history",
  "teams",
  "positions",
  "assignments",
  "attendance_categories",
  "service_types",
  "services",
  "headcounts",
  "audit_log",
] as const;
