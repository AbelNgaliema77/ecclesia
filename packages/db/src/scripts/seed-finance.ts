import { addMonths, type IsoDate, monthOf } from "@ecclesia/domain/finance";
import { en, Faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { currentChurchId, type Tx } from "../client";
import { finance, ledger } from "../repositories";
import {
  donorProfiles,
  expenseApprovals,
  expenseRequests,
  financePeriods,
  giftBatches,
  giftBatchLines,
  gifts,
} from "../schema";

const ADMIN = "demo-user";
const LEADER = "demo-leader";
const TREASURER = "demo-treasurer";
const PASTOR = "demo-pastor";

const rng = new Faker({ locale: [en], seed: 1517 });

const iso = (date: Date): IsoDate => date.toISOString().slice(0, 10);

const rand = (min: number, max: number, step = 1) =>
  Math.round(rng.number.int({ min: Math.round(min / step), max: Math.round(max / step) }) * step);

const sundays = (from: Date, to: Date) => {
  const days: IsoDate[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (cursor.getUTCDay() !== 0) cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= to) {
    days.push(iso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return days;
};

const chunk = <T>(items: readonly T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, i * size + size),
  );

export const seedFinance = async (
  tx: Tx,
  input: {
    everyone: readonly string[];
    financeTeamId: string | null;
    historyStart: Date;
    now: Date;
  },
) => {
  const fundRows = await finance.listFunds(tx);
  const fund = (code: string) => {
    const found = fundRows.find((f) => f.code === code);
    if (!found) throw new Error(`Missing fund ${code}`);
    return found.id;
  };
  const categories = await finance.listCategories(tx);
  const category = (en: string) => {
    const found = categories.find((c) => c.name.en === en);
    if (!found) throw new Error(`Missing category ${en}`);
    return found.id;
  };

  await finance.saveSettings(tx, {
    financeTeamId: input.financeTeamId,
    secondApprovalAboveCents: 500_000,
    requireTwoFactor: false,
    legalName: "Grace Harbour Church NPC",
    pboNumber: "930012345",
    address: "12 Harbour Road, Durbanville, 7550",
    signatoryName: "Demo Treasurer",
  });

  const donors = rng.helpers.shuffle([...input.everyone]).slice(0, 90);
  await tx.insert(donorProfiles).values(
    donors.map((personId, index) => ({
      churchId: currentChurchId,
      personId,
      givingNumber: `ENV-${String(index + 1).padStart(3, "0")}`,
      address:
        index % 3 === 0 ? `${rng.number.int({ min: 1, max: 200 })} Church Street, Cape Town` : null,
    })),
  );
  const envelopeGivers = donors.slice(0, 40);
  const eftGivers = donors.slice(30);

  const today = iso(input.now);
  const days = sundays(input.historyStart, input.now);
  const giftRows: Omit<typeof gifts.$inferInsert, "churchId">[] = [];

  for (const [index, day] of days.entries()) {
    const growth = 1 + (index / days.length) * 0.18;
    const isLatest = index === days.length - 1;
    const status = isLatest ? "submitted" : "verified";
    const [batch] = await tx
      .insert(giftBatches)
      .values({
        churchId: currentChurchId,
        receivedOn: day,
        status,
        createdBy: ADMIN,
        submittedBy: ADMIN,
        submittedAt: sql`${day}::date + interval '13 hours'`,
        verifiedBy: status === "verified" ? TREASURER : null,
        verifiedAt:
          status === "verified" ? sql`${day}::date + interval '13 hours 20 minutes'` : null,
      })
      .returning({ id: giftBatches.id });
    if (!batch) continue;
    const lines = [
      {
        fundId: fund("OFFERING"),
        personId: null,
        amountCents: rand(300_000 * growth, 650_000 * growth, 1000),
      },
      { fundId: fund("MISSIONS"), personId: null, amountCents: rand(20_000, 90_000, 500) },
      ...rng.helpers.arrayElements(envelopeGivers, { min: 10, max: 18 }).map((personId) => ({
        fundId: fund("TITHE"),
        personId,
        amountCents: rand(30_000, 250_000, 5000),
      })),
    ];
    await tx
      .insert(giftBatchLines)
      .values(lines.map((line) => ({ churchId: currentChurchId, batchId: batch.id, ...line })));
    if (status === "verified") {
      for (const line of lines) {
        giftRows.push({
          ...line,
          method: "cash",
          receivedOn: day,
          batchId: batch.id,
          recordedBy: TREASURER,
        });
      }
    }
  }

  for (let month = monthOf(iso(input.historyStart)); month <= today; month = addMonths(month, 1)) {
    for (const personId of eftGivers) {
      if (!rng.datatype.boolean(0.82)) continue;
      const receivedOn = `${month.slice(0, 8)}${String(rand(24, 28)).padStart(2, "0")}`;
      if (receivedOn > today) continue;
      giftRows.push({
        fundId: rng.datatype.boolean(0.12) ? fund("BUILDING") : fund("TITHE"),
        personId,
        method: rng.datatype.boolean(0.9) ? "eft" : "card",
        amountCents: rand(50_000, 450_000, 10_000),
        receivedOn,
        recordedBy: TREASURER,
      });
    }
  }
  for (const rows of chunk(giftRows, 500)) {
    await tx.insert(gifts).values(rows.map((row) => ({ ...row, churchId: currentChurchId })));
  }

  const [voidable] = await tx
    .select({ id: gifts.id })
    .from(gifts)
    .where(sql`${gifts.method} = 'eft'`)
    .limit(1);
  if (voidable) {
    await tx
      .update(gifts)
      .set({
        voidedAt: sql`now()`,
        voidedBy: TREASURER,
        voidReason: "Duplicate capture of the same EFT",
      })
      .where(sql`${gifts.id} = ${voidable.id}`);
  }

  type Plan = {
    title: string;
    payee: string;
    category: string;
    fund: string;
    min: number;
    max: number;
    requestedBy: string;
  };
  const monthly: Plan[] = [
    {
      title: "Hall rent",
      payee: "Durbanville Community Hall",
      category: "Rent and utilities",
      fund: "OFFERING",
      min: 1_850_000,
      max: 1_850_000,
      requestedBy: TREASURER,
    },
    {
      title: "Electricity and water",
      payee: "City of Cape Town",
      category: "Rent and utilities",
      fund: "OFFERING",
      min: 220_000,
      max: 410_000,
      requestedBy: TREASURER,
    },
    {
      title: "Worship leader honorarium",
      payee: "T. Mokoena",
      category: "Salaries and honoraria",
      fund: "TITHE",
      min: 450_000,
      max: 450_000,
      requestedBy: TREASURER,
    },
    {
      title: "Pastoral stipend",
      payee: "Senior pastor",
      category: "Salaries and honoraria",
      fund: "TITHE",
      min: 4_500_000,
      max: 4_500_000,
      requestedBy: TREASURER,
    },
    {
      title: "Staff salaries",
      payee: "Church office staff",
      category: "Salaries and honoraria",
      fund: "TITHE",
      min: 3_800_000,
      max: 3_800_000,
      requestedBy: TREASURER,
    },
    {
      title: "Insurance and bank fees",
      payee: "Santam and FNB",
      category: "Administration",
      fund: "OFFERING",
      min: 320_000,
      max: 380_000,
      requestedBy: TREASURER,
    },
  ];
  const occasional: Plan[] = [
    {
      title: "Sound cables and DI box",
      payee: "Musica Bellville",
      category: "Equipment",
      fund: "OFFERING",
      min: 80_000,
      max: 260_000,
      requestedBy: LEADER,
    },
    {
      title: "Youth camp transport",
      payee: "Cape Shuttle Co",
      category: "Ministry and events",
      fund: "OFFERING",
      min: 300_000,
      max: 900_000,
      requestedBy: LEADER,
    },
    {
      title: "Outreach food parcels",
      payee: "Makro Milnerton",
      category: "Outreach and missions",
      fund: "MISSIONS",
      min: 150_000,
      max: 420_000,
      requestedBy: TREASURER,
    },
    {
      title: "Roof gutter repair",
      payee: "Handy Andy Repairs",
      category: "Maintenance",
      fund: "BUILDING",
      min: 250_000,
      max: 1_100_000,
      requestedBy: LEADER,
    },
    {
      title: "Printing for Sunday bulletins",
      payee: "PostNet Durbanville",
      category: "Administration",
      fund: "OFFERING",
      min: 30_000,
      max: 95_000,
      requestedBy: LEADER,
    },
  ];

  let number = 0;
  const lastMonth = monthOf(today);
  for (
    let month = monthOf(iso(input.historyStart));
    month <= lastMonth;
    month = addMonths(month, 1)
  ) {
    const plans = [...monthly, ...rng.helpers.arrayElements(occasional, { min: 1, max: 2 })];
    for (const plan of plans) {
      number += 1;
      const amountCents = rand(plan.min, plan.max, 1000);
      const createdOn = `${month.slice(0, 8)}${String(rand(2, 20)).padStart(2, "0")}`;
      if (createdOn > today) continue;
      const isCurrent = month === lastMonth;
      const status = isCurrent
        ? rng.helpers.arrayElement(["submitted", "approved", "paid"] as const)
        : "paid";
      const paidOn = status === "paid" ? (createdOn < today ? createdOn : today) : null;
      const [request] = await tx
        .insert(expenseRequests)
        .values({
          churchId: currentChurchId,
          number,
          title: plan.title,
          payee: plan.payee,
          amountCents,
          categoryId: category(plan.category),
          fundId: fund(plan.fund),
          status,
          requestedBy: plan.requestedBy,
          createdAt: sql`${createdOn}::date + interval '9 hours'`,
          decidedAt: status === "submitted" ? null : sql`${createdOn}::date + interval '1 day'`,
          paidOn,
          paidBy: paidOn ? (plan.requestedBy === TREASURER ? ADMIN : TREASURER) : null,
          paidAt: paidOn ? sql`${paidOn}::date + interval '15 hours'` : null,
          paymentReference: paidOn ? `PAY-${number}` : null,
        })
        .returning({ id: expenseRequests.id });
      if (!request || status === "submitted") continue;
      const approvers = plan.requestedBy === TREASURER ? [ADMIN, PASTOR] : [TREASURER, ADMIN];
      if (amountCents <= 500_000) approvers.pop();
      await tx.insert(expenseApprovals).values(
        approvers
          .filter((approverId) => approverId !== plan.requestedBy)
          .map((approverId) => ({
            churchId: currentChurchId,
            requestId: request.id,
            approverId,
            decision: "approve" as const,
            createdAt: sql`${createdOn}::date + interval '1 day'`,
          })),
      );
    }
  }

  const year = Number(today.slice(0, 4));
  await ledger.saveBudget(
    tx,
    year,
    categories.map((c) => ({
      categoryId: c.id,
      amountCents:
        {
          "Rent and utilities": 28_000_000,
          "Salaries and honoraria": 105_000_000,
          "Ministry and events": 9_000_000,
          Equipment: 4_000_000,
          Maintenance: 6_000_000,
          "Outreach and missions": 5_500_000,
          Administration: 5_200_000,
        }[c.name.en] ?? 0,
    })),
  );

  const closeBefore = addMonths(monthOf(today), -1);
  const months: IsoDate[] = [];
  for (
    let month = monthOf(iso(input.historyStart));
    month < closeBefore;
    month = addMonths(month, 1)
  )
    months.push(month);
  if (months.length > 0) {
    await tx
      .insert(financePeriods)
      .values(months.map((month) => ({ churchId: currentChurchId, month, closedBy: TREASURER })));
  }
};
