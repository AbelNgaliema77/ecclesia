import {
  ATTACHMENT_KINDS,
  ATTACHMENT_TYPES,
  BATCH_STATUSES,
  EXPENSE_DECISIONS,
  EXPENSE_STATUSES,
  GIVING_METHODS,
  MAX_AMOUNT_CENTS,
  MAX_ATTACHMENT_BYTES,
} from "@ecclesia/domain/finance";
import { sql } from "drizzle-orm";
import {
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
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { type LocalizedText, people, services, teams } from "./church";
import { bytea, churchId, id, timestamps } from "./columns";
import { churches } from "./platform";

export const givingMethodEnum = pgEnum("giving_method", GIVING_METHODS);
export const batchStatusEnum = pgEnum("batch_status", BATCH_STATUSES);
export const expenseStatusEnum = pgEnum("expense_status", EXPENSE_STATUSES);
export const expenseDecisionEnum = pgEnum("expense_decision", EXPENSE_DECISIONS);
export const attachmentKindEnum = pgEnum("attachment_kind", ATTACHMENT_KINDS);
export const bankLineStatusEnum = pgEnum("bank_line_status", ["matched", "ignored"]);

const actor = () => text().references(() => user.id, { onDelete: "set null" });

const amountCents = () => integer().notNull();

const validAmount = (name: string, column: unknown) =>
  check(name, sql`${column} > 0 AND ${column} <= ${sql.raw(String(MAX_AMOUNT_CENTS))}`);

const isoDate = () => date({ mode: "string" });

export const funds = pgTable(
  "funds",
  {
    id: id(),
    churchId: churchId(),
    code: text().notNull(),
    name: jsonb().$type<LocalizedText>().notNull(),
    taxDeductible: boolean().notNull().default(true),
    isActive: boolean().notNull().default(true),
    sortOrder: smallint().notNull().default(0),
    ...timestamps(),
  },
  (t) => [unique().on(t.churchId, t.id), unique().on(t.churchId, t.code)],
);

export const expenseCategories = pgTable(
  "expense_categories",
  {
    id: id(),
    churchId: churchId(),
    name: jsonb().$type<LocalizedText>().notNull(),
    isActive: boolean().notNull().default(true),
    sortOrder: smallint().notNull().default(0),
    ...timestamps(),
  },
  (t) => [unique().on(t.churchId, t.id)],
);

export const financeSettings = pgTable(
  "finance_settings",
  {
    churchId: uuid()
      .primaryKey()
      .references(() => churches.id, { onDelete: "cascade" }),
    defaultFundId: uuid().references(() => funds.id, { onDelete: "set null" }),
    financeTeamId: uuid().references(() => teams.id, { onDelete: "set null" }),
    secondApprovalAboveCents: integer(),
    requireTwoFactor: boolean().notNull().default(true),
    legalName: text(),
    pboNumber: text(),
    address: text(),
    signatoryName: text(),
    ...timestamps(),
  },
  (t) => [
    check(
      "finance_settings_second_approval_valid",
      sql`${t.secondApprovalAboveCents} IS NULL OR ${t.secondApprovalAboveCents} > 0`,
    ),
  ],
);

export const donorProfiles = pgTable(
  "donor_profiles",
  {
    id: id(),
    churchId: churchId(),
    personId: uuid().notNull(),
    givingNumber: text(),
    taxNumber: text(),
    address: text(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    unique().on(t.churchId, t.personId),
    unique().on(t.churchId, t.givingNumber),
    foreignKey({
      columns: [t.churchId, t.personId],
      foreignColumns: [people.churchId, people.id],
    }).onDelete("cascade"),
  ],
);

export const giftBatches = pgTable(
  "gift_batches",
  {
    id: id(),
    churchId: churchId(),
    receivedOn: isoDate().notNull(),
    serviceId: uuid(),
    status: batchStatusEnum().notNull().default("draft"),
    notes: text(),
    createdBy: actor(),
    submittedBy: actor(),
    submittedAt: timestamp({ withTimezone: true }),
    verifiedBy: actor(),
    verifiedAt: timestamp({ withTimezone: true }),
    returnedReason: text(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    index().on(t.churchId, t.status, t.receivedOn),
    foreignKey({
      columns: [t.churchId, t.serviceId],
      foreignColumns: [services.churchId, services.id],
    }).onDelete("no action"),
    check(
      "gift_batches_two_people",
      sql`${t.verifiedBy} IS NULL OR ${t.submittedBy} IS NULL OR ${t.verifiedBy} <> ${t.submittedBy}`,
    ),
  ],
);

export const giftBatchLines = pgTable(
  "gift_batch_lines",
  {
    id: id(),
    churchId: churchId(),
    batchId: uuid().notNull(),
    fundId: uuid().notNull(),
    personId: uuid(),
    amountCents: amountCents(),
    ...timestamps(),
  },
  (t) => [
    index().on(t.churchId, t.batchId),
    foreignKey({
      columns: [t.churchId, t.batchId],
      foreignColumns: [giftBatches.churchId, giftBatches.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.churchId, t.fundId],
      foreignColumns: [funds.churchId, funds.id],
    }).onDelete("no action"),
    foreignKey({
      columns: [t.churchId, t.personId],
      foreignColumns: [people.churchId, people.id],
    }).onDelete("no action"),
    validAmount("gift_batch_lines_amount_valid", t.amountCents),
  ],
);

export const bankImports = pgTable(
  "bank_imports",
  {
    id: id(),
    churchId: churchId(),
    fileName: text().notNull(),
    importedBy: actor(),
    lineCount: integer().notNull(),
    giftCount: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.churchId, t.id)],
);

export const gifts = pgTable(
  "gifts",
  {
    id: id(),
    churchId: churchId(),
    fundId: uuid().notNull(),
    personId: uuid(),
    method: givingMethodEnum().notNull(),
    amountCents: amountCents(),
    receivedOn: isoDate().notNull(),
    reference: text(),
    batchId: uuid(),
    bankImportId: uuid(),
    recordedBy: actor(),
    voidedAt: timestamp({ withTimezone: true }),
    voidedBy: actor(),
    voidReason: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    index().on(t.churchId, t.receivedOn),
    index().on(t.churchId, t.personId, t.receivedOn),
    foreignKey({
      columns: [t.churchId, t.fundId],
      foreignColumns: [funds.churchId, funds.id],
    }).onDelete("no action"),
    foreignKey({
      columns: [t.churchId, t.personId],
      foreignColumns: [people.churchId, people.id],
    }).onDelete("no action"),
    foreignKey({
      columns: [t.churchId, t.batchId],
      foreignColumns: [giftBatches.churchId, giftBatches.id],
    }).onDelete("no action"),
    foreignKey({
      columns: [t.churchId, t.bankImportId],
      foreignColumns: [bankImports.churchId, bankImports.id],
    }).onDelete("no action"),
    validAmount("gifts_amount_valid", t.amountCents),
    check(
      "gifts_void_complete",
      sql`(${t.voidedAt} IS NULL AND ${t.voidReason} IS NULL) OR (${t.voidedAt} IS NOT NULL AND ${t.voidReason} IS NOT NULL)`,
    ),
  ],
);

export const bankLines = pgTable(
  "bank_lines",
  {
    id: id(),
    churchId: churchId(),
    importId: uuid().notNull(),
    postedOn: isoDate().notNull(),
    description: text().notNull(),
    amountCents: amountCents(),
    fingerprint: text().notNull(),
    status: bankLineStatusEnum().notNull(),
    giftId: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.churchId, t.fingerprint),
    foreignKey({
      columns: [t.churchId, t.importId],
      foreignColumns: [bankImports.churchId, bankImports.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.churchId, t.giftId],
      foreignColumns: [gifts.churchId, gifts.id],
    }).onDelete("no action"),
  ],
);

export const expenseRequests = pgTable(
  "expense_requests",
  {
    id: id(),
    churchId: churchId(),
    number: integer().notNull(),
    title: text().notNull(),
    description: text(),
    payee: text().notNull(),
    amountCents: amountCents(),
    categoryId: uuid().notNull(),
    fundId: uuid().notNull(),
    teamId: uuid(),
    neededBy: isoDate(),
    status: expenseStatusEnum().notNull().default("submitted"),
    requestedBy: actor(),
    decidedAt: timestamp({ withTimezone: true }),
    paidOn: isoDate(),
    paidBy: actor(),
    paidAt: timestamp({ withTimezone: true }),
    paymentReference: text(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    unique().on(t.churchId, t.number),
    index().on(t.churchId, t.status),
    index().on(t.churchId, t.paidOn),
    foreignKey({
      columns: [t.churchId, t.categoryId],
      foreignColumns: [expenseCategories.churchId, expenseCategories.id],
    }).onDelete("no action"),
    foreignKey({
      columns: [t.churchId, t.fundId],
      foreignColumns: [funds.churchId, funds.id],
    }).onDelete("no action"),
    foreignKey({
      columns: [t.churchId, t.teamId],
      foreignColumns: [teams.churchId, teams.id],
    }).onDelete("no action"),
    validAmount("expense_requests_amount_valid", t.amountCents),
    check(
      "expense_requests_paid_complete",
      sql`${t.status} <> 'paid' OR (${t.paidOn} IS NOT NULL AND ${t.paymentReference} IS NOT NULL)`,
    ),
  ],
);

export const expenseApprovals = pgTable(
  "expense_approvals",
  {
    id: id(),
    churchId: churchId(),
    requestId: uuid().notNull(),
    approverId: actor(),
    decision: expenseDecisionEnum().notNull(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.churchId, t.requestId, t.approverId),
    foreignKey({
      columns: [t.churchId, t.requestId],
      foreignColumns: [expenseRequests.churchId, expenseRequests.id],
    }).onDelete("cascade"),
  ],
);

export const expenseAttachments = pgTable(
  "expense_attachments",
  {
    id: id(),
    churchId: churchId(),
    requestId: uuid().notNull(),
    kind: attachmentKindEnum().notNull(),
    fileName: text().notNull(),
    contentType: text().notNull(),
    byteSize: integer().notNull(),
    data: bytea().notNull(),
    uploadedBy: actor(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.churchId, t.id),
    index().on(t.churchId, t.requestId),
    foreignKey({
      columns: [t.churchId, t.requestId],
      foreignColumns: [expenseRequests.churchId, expenseRequests.id],
    }).onDelete("cascade"),
    check(
      "expense_attachments_type_valid",
      sql.raw(`content_type in (${ATTACHMENT_TYPES.map((type) => `'${type}'`).join(", ")})`),
    ),
    check(
      "expense_attachments_size_valid",
      sql.raw(
        `byte_size > 0 AND byte_size <= ${MAX_ATTACHMENT_BYTES} AND octet_length(data) = byte_size`,
      ),
    ),
  ],
);

export const budgetLines = pgTable(
  "budget_lines",
  {
    id: id(),
    churchId: churchId(),
    year: smallint().notNull(),
    categoryId: uuid().notNull(),
    amountCents: integer().notNull(),
    ...timestamps(),
  },
  (t) => [
    unique().on(t.churchId, t.year, t.categoryId),
    foreignKey({
      columns: [t.churchId, t.categoryId],
      foreignColumns: [expenseCategories.churchId, expenseCategories.id],
    }).onDelete("cascade"),
    check("budget_lines_amount_valid", sql`${t.amountCents} >= 0`),
  ],
);

export const financePeriods = pgTable(
  "finance_periods",
  {
    id: id(),
    churchId: churchId(),
    month: isoDate().notNull(),
    closedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    closedBy: actor(),
  },
  (t) => [
    unique().on(t.churchId, t.month),
    check("finance_periods_first_of_month", sql`extract(day from ${t.month}) = 1`),
  ],
);

export const taxCertificates = pgTable(
  "tax_certificates",
  {
    id: id(),
    churchId: churchId(),
    personId: uuid().notNull(),
    taxYear: smallint().notNull(),
    sequence: integer().notNull(),
    amountCents: integer().notNull(),
    issuedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    issuedBy: actor(),
  },
  (t) => [
    unique().on(t.churchId, t.personId, t.taxYear),
    unique().on(t.churchId, t.taxYear, t.sequence),
    foreignKey({
      columns: [t.churchId, t.personId],
      foreignColumns: [people.churchId, people.id],
    }).onDelete("no action"),
    check("tax_certificates_amount_valid", sql`${t.amountCents} > 0`),
  ],
);
