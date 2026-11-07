import type {
  BatchLine,
  BatchStatus,
  DonorProfileInput,
  GivingMethod,
  IsoDate,
} from "@ecclesia/domain/finance";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { currentChurchId, type Tx } from "../client";
import {
  bankImports,
  bankLines,
  donorProfiles,
  funds,
  giftBatches,
  giftBatchLines,
  gifts,
  people,
  services,
  serviceTypes,
  user,
} from "../schema";

const personName = {
  personFirstName: people.firstName,
  personLastName: people.lastName,
};

const sumCents = sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`.mapWith(Number);

const countedGifts = isNull(gifts.voidedAt);

export type NewGift = {
  readonly fundId: string;
  readonly personId: string | null;
  readonly method: GivingMethod;
  readonly amountCents: number;
  readonly receivedOn: IsoDate;
  readonly reference: string | null;
  readonly batchId?: string | null;
  readonly bankImportId?: string | null;
};

export const insertGifts = async (tx: Tx, rows: readonly NewGift[], actorUserId: string) => {
  if (rows.length === 0) return [];
  return tx
    .insert(gifts)
    .values(rows.map((row) => ({ churchId: currentChurchId, ...row, recordedBy: actorUserId })))
    .returning({ id: gifts.id });
};

export const getGift = async (tx: Tx, id: string) => {
  const [row] = await tx.select().from(gifts).where(eq(gifts.id, id));
  return row ?? null;
};

export const voidGift = async (tx: Tx, id: string, actorUserId: string, reason: string) => {
  const [row] = await tx
    .update(gifts)
    .set({ voidedAt: sql`now()`, voidedBy: actorUserId, voidReason: reason })
    .where(and(eq(gifts.id, id), isNull(gifts.voidedAt)))
    .returning();
  return row ?? null;
};

export type GiftQuery = {
  readonly from: IsoDate;
  readonly to: IsoDate;
  readonly fundId?: string | null;
  readonly method?: GivingMethod | null;
  readonly personId?: string | null;
  readonly search?: string | null;
  readonly includeVoided?: boolean;
  readonly limit: number;
  readonly offset: number;
};

const giftFilters = (query: GiftQuery): SQL | undefined => {
  const term = query.search?.trim();
  return and(
    gte(gifts.receivedOn, query.from),
    lte(gifts.receivedOn, query.to),
    query.fundId ? eq(gifts.fundId, query.fundId) : undefined,
    query.method ? eq(gifts.method, query.method) : undefined,
    query.personId ? eq(gifts.personId, query.personId) : undefined,
    query.includeVoided ? undefined : countedGifts,
    term
      ? or(
          ilike(gifts.reference, `%${term}%`),
          ilike(sql`${people.firstName} || ' ' || ${people.lastName}`, `%${term}%`),
        )
      : undefined,
  );
};

export const listGifts = async (tx: Tx, query: GiftQuery) => {
  const where = giftFilters(query);
  const [rows, [summary]] = await Promise.all([
    tx
      .select({
        id: gifts.id,
        amountCents: gifts.amountCents,
        method: gifts.method,
        receivedOn: gifts.receivedOn,
        reference: gifts.reference,
        personId: gifts.personId,
        ...personName,
        fundId: gifts.fundId,
        fundName: funds.name,
        batchId: gifts.batchId,
        bankImportId: gifts.bankImportId,
        voidedAt: gifts.voidedAt,
        voidReason: gifts.voidReason,
      })
      .from(gifts)
      .innerJoin(funds, eq(funds.id, gifts.fundId))
      .leftJoin(people, eq(people.id, gifts.personId))
      .where(where)
      .orderBy(desc(gifts.receivedOn), desc(gifts.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    tx
      .select({
        count: sql<number>`count(*)::int`,
        totalCents:
          sql<number>`coalesce(sum(${gifts.amountCents}) filter (where ${gifts.voidedAt} is null), 0)::bigint`.mapWith(
            Number,
          ),
      })
      .from(gifts)
      .leftJoin(people, eq(people.id, gifts.personId))
      .where(where),
  ]);
  return { rows, total: summary?.count ?? 0, totalCents: summary?.totalCents ?? 0 };
};

export const totalsByMonthAndFund = (tx: Tx, from: IsoDate, to: IsoDate) =>
  tx
    .select({
      month: sql<string>`to_char(${gifts.receivedOn}, 'YYYY-MM')`,
      fundId: gifts.fundId,
      totalCents: sumCents,
    })
    .from(gifts)
    .where(and(countedGifts, gte(gifts.receivedOn, from), lte(gifts.receivedOn, to)))
    .groupBy(sql`1`, gifts.fundId);

export const totalsByMethod = (tx: Tx, from: IsoDate, to: IsoDate) =>
  tx
    .select({ method: gifts.method, totalCents: sumCents, count: sql<number>`count(*)::int` })
    .from(gifts)
    .where(and(countedGifts, gte(gifts.receivedOn, from), lte(gifts.receivedOn, to)))
    .groupBy(gifts.method);

export const givingStats = async (tx: Tx, from: IsoDate, to: IsoDate) => {
  const [row] = await tx
    .select({
      totalCents: sumCents,
      givers: sql<number>`count(distinct ${gifts.personId})::int`,
      firstTimeGivers: sql<number>`count(distinct ${gifts.personId}) filter (where not exists (
        select 1 from ${gifts} earlier where earlier.person_id = ${gifts.personId}
          and earlier.voided_at is null and earlier.received_on < ${from}
      ))::int`,
    })
    .from(gifts)
    .where(and(countedGifts, gte(gifts.receivedOn, from), lte(gifts.receivedOn, to)));
  return row ?? { totalCents: 0, givers: 0, firstTimeGivers: 0 };
};

export const yearlyTotalsForPerson = (tx: Tx, personId: string) =>
  tx
    .select({
      year: sql<number>`extract(year from ${gifts.receivedOn})::int`,
      totalCents: sumCents,
      count: sql<number>`count(*)::int`,
    })
    .from(gifts)
    .where(and(countedGifts, eq(gifts.personId, personId)))
    .groupBy(sql`1`)
    .orderBy(desc(sql`1`));

export type DonorQuery = {
  readonly search?: string | null;
  readonly yearStart: IsoDate;
  readonly limit: number;
  readonly offset: number;
};

export const listDonors = async (tx: Tx, query: DonorQuery) => {
  const term = query.search?.trim();
  const giftTotals = tx
    .select({
      personId: gifts.personId,
      yearCents:
        sql<number>`coalesce(sum(${gifts.amountCents}) filter (where ${gifts.receivedOn} >= ${query.yearStart}), 0)::bigint`
          .mapWith(Number)
          .as("year_cents"),
      lastGiftOn: sql<string>`max(${gifts.receivedOn})`.as("last_gift_on"),
    })
    .from(gifts)
    .where(and(countedGifts, isNotNull(gifts.personId)))
    .groupBy(gifts.personId)
    .as("gift_totals");
  const where = and(
    isNull(people.deletedAt),
    or(isNotNull(donorProfiles.id), isNotNull(giftTotals.personId)),
    term
      ? or(
          ilike(sql`${people.firstName} || ' ' || ${people.lastName}`, `%${term}%`),
          ilike(donorProfiles.givingNumber, `%${term}%`),
        )
      : undefined,
  );
  const base = tx
    .select({
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      givingNumber: donorProfiles.givingNumber,
      yearCents: sql<number>`coalesce(${giftTotals.yearCents}, 0)`.mapWith(Number),
      lastGiftOn: giftTotals.lastGiftOn,
    })
    .from(people)
    .leftJoin(donorProfiles, eq(donorProfiles.personId, people.id))
    .leftJoin(giftTotals, eq(giftTotals.personId, people.id))
    .where(where);
  const [rows, [count]] = await Promise.all([
    base
      .orderBy(asc(people.lastName), asc(people.firstName))
      .limit(query.limit)
      .offset(query.offset),
    tx
      .select({ value: sql<number>`count(*)::int` })
      .from(people)
      .leftJoin(donorProfiles, eq(donorProfiles.personId, people.id))
      .leftJoin(giftTotals, eq(giftTotals.personId, people.id))
      .where(where),
  ]);
  return { rows, total: count?.value ?? 0 };
};

export const getDonorProfile = async (tx: Tx, personId: string) => {
  const [row] = await tx.select().from(donorProfiles).where(eq(donorProfiles.personId, personId));
  return row ?? null;
};

export const givingNumberOwner = async (tx: Tx, givingNumber: string) => {
  const [row] = await tx
    .select({ personId: donorProfiles.personId })
    .from(donorProfiles)
    .where(eq(donorProfiles.givingNumber, givingNumber));
  return row?.personId ?? null;
};

export const saveDonorProfile = async (tx: Tx, input: DonorProfileInput) => {
  const values = {
    givingNumber: input.givingNumber,
    taxNumber: input.taxNumber,
    address: input.address,
  };
  await tx
    .insert(donorProfiles)
    .values({ churchId: currentChurchId, personId: input.personId, ...values })
    .onConflictDoUpdate({ target: [donorProfiles.churchId, donorProfiles.personId], set: values });
};

export const donorNumbers = (tx: Tx) =>
  tx
    .select({ personId: donorProfiles.personId, givingNumber: donorProfiles.givingNumber })
    .from(donorProfiles)
    .innerJoin(people, eq(people.id, donorProfiles.personId))
    .where(and(isNotNull(donorProfiles.givingNumber), isNull(people.deletedAt)));

export const insertBatch = async (
  tx: Tx,
  input: { receivedOn: IsoDate; serviceId: string | null; notes: string | null },
  actorUserId: string,
) => {
  const [row] = await tx
    .insert(giftBatches)
    .values({ churchId: currentChurchId, ...input, createdBy: actorUserId })
    .returning();
  if (!row) throw new Error("Batch insert failed");
  return row;
};

const submitter = alias(user, "submitter");
const verifier = alias(user, "verifier");

export const getBatch = async (tx: Tx, id: string) => {
  const [batch] = await tx
    .select({
      id: giftBatches.id,
      receivedOn: giftBatches.receivedOn,
      serviceId: giftBatches.serviceId,
      serviceName: serviceTypes.name,
      status: giftBatches.status,
      notes: giftBatches.notes,
      createdBy: giftBatches.createdBy,
      submittedBy: giftBatches.submittedBy,
      submittedByName: submitter.name,
      submittedAt: giftBatches.submittedAt,
      verifiedBy: giftBatches.verifiedBy,
      verifiedByName: verifier.name,
      verifiedAt: giftBatches.verifiedAt,
      returnedReason: giftBatches.returnedReason,
    })
    .from(giftBatches)
    .leftJoin(services, eq(services.id, giftBatches.serviceId))
    .leftJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
    .leftJoin(submitter, eq(submitter.id, giftBatches.submittedBy))
    .leftJoin(verifier, eq(verifier.id, giftBatches.verifiedBy))
    .where(eq(giftBatches.id, id));
  if (!batch) return null;
  const lines = await tx
    .select({
      id: giftBatchLines.id,
      fundId: giftBatchLines.fundId,
      personId: giftBatchLines.personId,
      ...personName,
      amountCents: giftBatchLines.amountCents,
    })
    .from(giftBatchLines)
    .leftJoin(people, eq(people.id, giftBatchLines.personId))
    .where(eq(giftBatchLines.batchId, id))
    .orderBy(asc(giftBatchLines.createdAt), asc(giftBatchLines.id));
  return { ...batch, lines };
};

export type BatchDetail = NonNullable<Awaited<ReturnType<typeof getBatch>>>;

export const lockBatch = async (tx: Tx, id: string) => {
  const [row] = await tx
    .select({ id: giftBatches.id })
    .from(giftBatches)
    .where(eq(giftBatches.id, id))
    .for("update");
  return row !== undefined;
};

export const replaceBatchLines = async (tx: Tx, batchId: string, lines: readonly BatchLine[]) => {
  await tx.delete(giftBatchLines).where(eq(giftBatchLines.batchId, batchId));
  if (lines.length === 0) return;
  await tx.insert(giftBatchLines).values(
    lines.map((line) => ({
      churchId: currentChurchId,
      batchId,
      fundId: line.fundId,
      personId: line.personId,
      amountCents: line.amount,
    })),
  );
};

export const updateBatchDetails = (
  tx: Tx,
  id: string,
  input: { receivedOn: IsoDate; serviceId: string | null; notes: string | null },
) => tx.update(giftBatches).set(input).where(eq(giftBatches.id, id));

export const setBatchStatus = async (
  tx: Tx,
  id: string,
  status: BatchStatus,
  actorUserId: string,
  reason: string | null = null,
) => {
  const patch =
    status === "submitted"
      ? { status, submittedBy: actorUserId, submittedAt: sql`now()`, returnedReason: null }
      : status === "verified"
        ? { status, verifiedBy: actorUserId, verifiedAt: sql`now()` }
        : { status, submittedBy: null, submittedAt: null, returnedReason: reason };
  await tx.update(giftBatches).set(patch).where(eq(giftBatches.id, id));
};

export const listBatches = (
  tx: Tx,
  options: { statuses?: readonly BatchStatus[]; limit: number },
) =>
  tx
    .select({
      id: giftBatches.id,
      receivedOn: giftBatches.receivedOn,
      status: giftBatches.status,
      serviceName: serviceTypes.name,
      submittedByName: submitter.name,
      verifiedByName: verifier.name,
      totalCents:
        sql<number>`coalesce((select sum(l.amount_cents) from ${giftBatchLines} l where l.batch_id = ${giftBatches.id}), 0)::bigint`.mapWith(
          Number,
        ),
      lineCount: sql<number>`(select count(*) from ${giftBatchLines} l where l.batch_id = ${giftBatches.id})::int`,
    })
    .from(giftBatches)
    .leftJoin(services, eq(services.id, giftBatches.serviceId))
    .leftJoin(serviceTypes, eq(serviceTypes.id, services.serviceTypeId))
    .leftJoin(submitter, eq(submitter.id, giftBatches.submittedBy))
    .leftJoin(verifier, eq(verifier.id, giftBatches.verifiedBy))
    .where(options.statuses ? inArray(giftBatches.status, [...options.statuses]) : undefined)
    .orderBy(desc(giftBatches.receivedOn), desc(giftBatches.createdAt))
    .limit(options.limit);

export const deleteDraftBatch = async (tx: Tx, id: string) => {
  const rows = await tx
    .delete(giftBatches)
    .where(and(eq(giftBatches.id, id), eq(giftBatches.status, "draft")))
    .returning({ id: giftBatches.id });
  return rows.length > 0;
};

export const knownFingerprints = async (tx: Tx, fingerprints: readonly string[]) => {
  if (fingerprints.length === 0) return new Set<string>();
  const rows = await tx
    .select({ fingerprint: bankLines.fingerprint })
    .from(bankLines)
    .where(inArray(bankLines.fingerprint, [...fingerprints]));
  return new Set(rows.map((r) => r.fingerprint));
};

export const insertBankImport = async (
  tx: Tx,
  input: { fileName: string; lineCount: number; giftCount: number },
  actorUserId: string,
) => {
  const [row] = await tx
    .insert(bankImports)
    .values({ churchId: currentChurchId, ...input, importedBy: actorUserId })
    .returning({ id: bankImports.id });
  if (!row) throw new Error("Bank import insert failed");
  return row.id;
};

export const insertBankLines = async (
  tx: Tx,
  importId: string,
  lines: readonly {
    postedOn: IsoDate;
    description: string;
    amountCents: number;
    fingerprint: string;
    status: "matched" | "ignored";
    giftId: string | null;
  }[],
) => {
  if (lines.length === 0) return;
  await tx
    .insert(bankLines)
    .values(lines.map((line) => ({ churchId: currentChurchId, importId, ...line })));
};

export const listBankImports = (tx: Tx, limit: number) =>
  tx
    .select({
      id: bankImports.id,
      fileName: bankImports.fileName,
      lineCount: bankImports.lineCount,
      giftCount: bankImports.giftCount,
      createdAt: bankImports.createdAt,
      importedByName: user.name,
    })
    .from(bankImports)
    .leftJoin(user, eq(user.id, bankImports.importedBy))
    .orderBy(desc(bankImports.createdAt))
    .limit(limit);
