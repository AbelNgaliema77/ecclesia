import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, currentChurchId, withChurch } from "./client";
import { expenses, finance, giving, ledger, people, provisioning } from "./repositories";
import { churches, giftBatches, gifts, user } from "./schema";
import "./scripts/env";

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

describe.skipIf(!appUrl || !ownerUrl)("finance repositories", () => {
  const owner = createDatabase(ownerUrl ?? "", { maxConnections: 1 });
  const app = createDatabase(appUrl ?? "", { maxConnections: 2 });
  const suffix = randomUUID().slice(0, 8);
  const admin = `fin-admin-${suffix}`;
  const counter = `fin-counter-${suffix}`;
  const otherOwner = `fin-other-${suffix}`;
  let churchId = "";
  let otherChurchId = "";
  let personId = "";

  const run = <T>(work: Parameters<typeof withChurch<T>>[2]) => withChurch(app, churchId, work);

  beforeAll(async () => {
    for (const id of [admin, counter, otherOwner]) {
      await owner.insert(user).values({ id, name: id, email: `${id}@example.test` });
    }
    churchId = (
      await provisioning.provisionChurch(app, {
        name: "Finance Church",
        slug: `fin-${suffix}`,
        defaultLocale: "en",
        ownerUserId: admin,
      })
    ).church.id;
    otherChurchId = (
      await provisioning.provisionChurch(app, {
        name: "Other Church",
        slug: `fin-other-${suffix}`,
        defaultLocale: "en",
        ownerUserId: otherOwner,
      })
    ).church.id;
    personId = await run(async (tx) => {
      const person = await people.insertPerson(tx, {
        firstName: "Ama",
        lastName: "Mensah",
        gender: "female",
        email: null,
        phone: null,
        dateOfBirth: null,
        joinedYear: null,
      });
      return person.id;
    });
  });

  afterAll(async () => {
    await owner.delete(churches).where(eq(churches.id, churchId));
    await owner.delete(churches).where(eq(churches.id, otherChurchId));
    for (const id of [admin, counter, otherOwner]) await owner.delete(user).where(eq(user.id, id));
    await owner.$client.end();
    await app.$client.end();
  });

  it("provisions default funds, categories and settings", async () => {
    await run(async (tx) => {
      const funds = await finance.listFunds(tx);
      expect(funds.map((f) => f.code)).toEqual(["TITHE", "OFFERING", "BUILDING", "MISSIONS"]);
      expect((await finance.listCategories(tx)).length).toBeGreaterThan(5);
      const settings = await finance.getSettings(tx);
      expect(settings.defaultFundId).toBe(funds[0]?.id);
      expect(settings.requireTwoFactor).toBe(true);
    });
  });

  it("keeps gifts immutable except for a single void", async () => {
    const giftId = await run(async (tx) => {
      const [fund] = await finance.listFunds(tx);
      const [row] = await giving.insertGifts(
        tx,
        [
          {
            fundId: fund?.id ?? "",
            personId,
            method: "eft",
            amountCents: 50_000,
            receivedOn: "2026-10-04",
            reference: "ENV-1",
          },
        ],
        admin,
      );
      return row?.id ?? "";
    });

    await expect(
      run((tx) => tx.update(gifts).set({ amountCents: 1 }).where(eq(gifts.id, giftId))),
    ).rejects.toThrow();
    await expect(run((tx) => tx.delete(gifts).where(eq(gifts.id, giftId)))).rejects.toThrow();

    await run(async (tx) => {
      expect(await giving.voidGift(tx, giftId, admin, "Captured twice")).not.toBeNull();
      expect(await giving.voidGift(tx, giftId, admin, "Again")).toBeNull();
      const listed = await giving.listGifts(tx, {
        from: "2026-10-01",
        to: "2026-10-31",
        limit: 10,
        offset: 0,
      });
      expect(listed.rows).toHaveLength(0);
      const withVoided = await giving.listGifts(tx, {
        from: "2026-10-01",
        to: "2026-10-31",
        includeVoided: true,
        limit: 10,
        offset: 0,
      });
      expect(withVoided.rows).toHaveLength(1);
      expect(withVoided.totalCents).toBe(0);
    });
  });

  it("isolates finance data between churches", async () => {
    await withChurch(app, otherChurchId, async (tx) => {
      const listed = await giving.listGifts(tx, {
        from: "2000-01-01",
        to: "2100-01-01",
        includeVoided: true,
        limit: 10,
        offset: 0,
      });
      expect(listed.total).toBe(0);
      expect(await giving.getDonorProfile(tx, personId)).toBeNull();
    });
  });

  it("refuses a batch verified by the person who submitted it", async () => {
    await run(async (tx) => {
      const batch = await giving.insertBatch(
        tx,
        { receivedOn: "2026-10-04", serviceId: null, notes: null },
        admin,
      );
      await giving.setBatchStatus(tx, batch.id, "submitted", admin);
      await expect(
        tx.transaction((inner) =>
          inner
            .update(giftBatches)
            .set({ status: "verified", verifiedBy: admin })
            .where(eq(giftBatches.id, batch.id)),
        ),
      ).rejects.toThrow();
      await giving.setBatchStatus(tx, batch.id, "verified", counter);
      expect((await giving.getBatch(tx, batch.id))?.status).toBe("verified");
    });
  });

  it("numbers expense requests and stores receipts per church", async () => {
    await run(async (tx) => {
      const [category] = await finance.listCategories(tx);
      const [fund] = await finance.listFunds(tx);
      const input = {
        title: "Cables",
        description: "",
        payee: "Music shop",
        amount: 120_000,
        categoryId: category?.id ?? "",
        fundId: fund?.id ?? "",
        teamId: null,
        neededBy: null,
      };
      const first = await expenses.insertExpense(tx, input, admin);
      const second = await expenses.insertExpense(tx, input, admin);
      expect(second.number).toBe(first.number + 1);
      const attachmentId = await expenses.insertAttachment(
        tx,
        {
          requestId: first.id,
          kind: "receipt",
          fileName: "receipt.png",
          contentType: "image/png",
          data: PNG,
        },
        admin,
      );
      const stored = await expenses.getAttachment(tx, attachmentId);
      expect(Array.from(stored?.data ?? [])).toEqual(Array.from(PNG));
      await expenses.insertDecision(tx, {
        requestId: first.id,
        approverId: counter,
        decision: "approve",
        note: null,
      });
      await expect(
        tx.transaction((inner) =>
          expenses.insertDecision(inner, {
            requestId: first.id,
            approverId: counter,
            decision: "approve",
            note: null,
          }),
        ),
      ).rejects.toThrow();
      const awaiting = await expenses.listExpenses(tx, {
        scope: { kind: "church" },
        awaitingUserId: counter,
        limit: 10,
        offset: 0,
      });
      expect(awaiting.rows.map((r) => r.id)).toEqual([second.id]);
    });
    await withChurch(app, otherChurchId, async (tx) => {
      const listed = await expenses.listExpenses(tx, {
        scope: { kind: "church" },
        limit: 10,
        offset: 0,
      });
      expect(listed.total).toBe(0);
    });
  });

  it("issues certificate numbers once per donor and tax year", async () => {
    await run(async (tx) => {
      const first = await ledger.issueCertificate(
        tx,
        { personId, taxYear: 2027, amountCents: 1000 },
        admin,
      );
      const again = await ledger.issueCertificate(
        tx,
        { personId, taxYear: 2027, amountCents: 2000 },
        admin,
      );
      expect(again.sequence).toBe(first.sequence);
      expect(again.amountCents).toBe(2000);
    });
  });

  it("closes and reopens months", async () => {
    await run(async (tx) => {
      expect(await finance.closeMonth(tx, "2026-09-01", admin)).toBe(true);
      expect(await finance.closeMonth(tx, "2026-09-01", admin)).toBe(false);
      expect([...(await finance.closedMonths(tx))]).toEqual(["2026-09-01"]);
      expect(await finance.reopenMonth(tx, "2026-09-01")).toBe(true);
      await expect(
        tx.transaction((inner) =>
          inner.execute(
            sql`insert into finance_periods (church_id, month) values (${currentChurchId}, '2026-09-15')`,
          ),
        ),
      ).rejects.toThrow();
    });
  });
});
