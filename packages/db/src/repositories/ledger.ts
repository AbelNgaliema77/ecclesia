import type { IsoDate } from "@ecclesia/domain/finance";
import { and, asc, eq, gte, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { budgetLines, donorProfiles, funds, gifts, people, taxCertificates } from "../schema";

export const budgetFor = async (tx: Tx, year: number) => {
  const rows = await tx
    .select({ categoryId: budgetLines.categoryId, amountCents: budgetLines.amountCents })
    .from(budgetLines)
    .where(eq(budgetLines.year, year));
  return new Map(rows.map((r) => [r.categoryId, r.amountCents]));
};

export const saveBudget = async (
  tx: Tx,
  year: number,
  lines: readonly { categoryId: string; amountCents: number }[],
) => {
  if (lines.length === 0) return;
  await tx
    .insert(budgetLines)
    .values(lines.map((line) => ({ churchId: currentChurchId, year, ...line })))
    .onConflictDoUpdate({
      target: [budgetLines.churchId, budgetLines.year, budgetLines.categoryId],
      set: { amountCents: sql`excluded.amount_cents` },
    });
};

export const incomeByFund = (tx: Tx, from: IsoDate, to: IsoDate) =>
  tx
    .select({
      fundId: gifts.fundId,
      totalCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`.mapWith(Number),
    })
    .from(gifts)
    .where(and(isNull(gifts.voidedAt), gte(gifts.receivedOn, from), lte(gifts.receivedOn, to)))
    .groupBy(gifts.fundId);

export const deductibleTotals = (tx: Tx, from: IsoDate, to: IsoDate) =>
  tx
    .select({
      personId: people.id,
      firstName: people.firstName,
      lastName: people.lastName,
      givingNumber: donorProfiles.givingNumber,
      totalCents: sql<number>`sum(${gifts.amountCents})::bigint`.mapWith(Number),
      giftCount: sql<number>`count(*)::int`,
      certificateSequence: taxCertificates.sequence,
      certificateAmountCents: taxCertificates.amountCents,
      certificateIssuedAt: taxCertificates.issuedAt,
    })
    .from(gifts)
    .innerJoin(funds, eq(funds.id, gifts.fundId))
    .innerJoin(people, eq(people.id, gifts.personId))
    .leftJoin(donorProfiles, eq(donorProfiles.personId, people.id))
    .leftJoin(
      taxCertificates,
      and(
        eq(taxCertificates.personId, people.id),
        eq(taxCertificates.taxYear, sql`${Number(to.slice(0, 4))}`),
      ),
    )
    .where(
      and(
        isNull(gifts.voidedAt),
        isNotNull(gifts.personId),
        eq(funds.taxDeductible, true),
        gte(gifts.receivedOn, from),
        lte(gifts.receivedOn, to),
      ),
    )
    .groupBy(
      people.id,
      donorProfiles.givingNumber,
      taxCertificates.sequence,
      taxCertificates.amountCents,
      taxCertificates.issuedAt,
    )
    .orderBy(asc(people.lastName), asc(people.firstName));

export const deductibleTotalFor = async (tx: Tx, personId: string, from: IsoDate, to: IsoDate) => {
  const [row] = await tx
    .select({
      totalCents: sql<number>`coalesce(sum(${gifts.amountCents}), 0)::bigint`.mapWith(Number),
    })
    .from(gifts)
    .innerJoin(funds, eq(funds.id, gifts.fundId))
    .where(
      and(
        isNull(gifts.voidedAt),
        eq(gifts.personId, personId),
        eq(funds.taxDeductible, true),
        gte(gifts.receivedOn, from),
        lte(gifts.receivedOn, to),
      ),
    );
  return row?.totalCents ?? 0;
};

export const getCertificate = async (tx: Tx, personId: string, taxYear: number) => {
  const [row] = await tx
    .select()
    .from(taxCertificates)
    .where(and(eq(taxCertificates.personId, personId), eq(taxCertificates.taxYear, taxYear)));
  return row ?? null;
};

export const issueCertificate = async (
  tx: Tx,
  input: { personId: string; taxYear: number; amountCents: number },
  actorUserId: string,
) => {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('tax_certificate:' || ${currentChurchId}::text || ':' || ${input.taxYear}::text))`,
  );
  const existing = await getCertificate(tx, input.personId, input.taxYear);
  if (existing) {
    const [row] = await tx
      .update(taxCertificates)
      .set({ amountCents: input.amountCents, issuedAt: sql`now()`, issuedBy: actorUserId })
      .where(eq(taxCertificates.id, existing.id))
      .returning();
    return row ?? existing;
  }
  const [max] = await tx
    .select({ value: sql<number>`coalesce(max(${taxCertificates.sequence}), 0)::int` })
    .from(taxCertificates)
    .where(eq(taxCertificates.taxYear, input.taxYear));
  const [row] = await tx
    .insert(taxCertificates)
    .values({
      churchId: currentChurchId,
      ...input,
      sequence: (max?.value ?? 0) + 1,
      issuedBy: actorUserId,
    })
    .returning();
  if (!row) throw new Error("Certificate insert failed");
  return row;
};
