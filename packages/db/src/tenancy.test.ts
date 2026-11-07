import { randomUUID } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, withChurch } from "./client";
import { audit, people, provisioning, teams } from "./repositories";
import { auditLog, churches, people as peopleTable, user } from "./schema";
import "./scripts/env";

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("tenant isolation", () => {
  const owner = createDatabase(ownerUrl ?? "", { maxConnections: 2 });
  const app = createDatabase(appUrl ?? "", { maxConnections: 4 });
  const suffix = randomUUID().slice(0, 8);
  const userIds = [`test-a-${suffix}`, `test-b-${suffix}`];
  let churchA = "";
  let churchB = "";
  let personA = "";
  let positionB = "";

  beforeAll(async () => {
    await owner
      .insert(user)
      .values(userIds.map((id) => ({ id, name: id, email: `${id}@example.test` })));
    const a = await provisioning.provisionChurch(app, {
      name: "Church A",
      slug: `church-a-${suffix}`,
      defaultLocale: "en",
      ownerUserId: userIds[0] ?? "",
    });
    const b = await provisioning.provisionChurch(app, {
      name: "Église B",
      slug: `church-b-${suffix}`,
      defaultLocale: "fr",
      ownerUserId: userIds[1] ?? "",
    });
    churchA = a.church.id;
    churchB = b.church.id;

    personA = await withChurch(app, churchA, async (tx) => {
      const p = await people.insertPerson(
        tx,
        {
          firstName: "Thandi",
          lastName: "Nkosi",
          preferredName: null,
          gender: "female",
          email: null,
          phone: null,
          dateOfBirth: null,
          status: "member",
          firstVisitOn: null,
          householdId: null,
          notes: null,
        },
        userIds[0] ?? null,
      );
      return p.id;
    });

    positionB = await withChurch(app, churchB, async (tx) => {
      await people.insertPerson(
        tx,
        {
          firstName: "Jean",
          lastName: "Mukendi",
          preferredName: null,
          gender: "male",
          email: null,
          phone: null,
          dateOfBirth: null,
          status: "member",
          firstVisitOn: null,
          householdId: null,
          notes: null,
        },
        userIds[1] ?? null,
      );
      const team = await teams.insertTeam(tx, {
        name: { en: "Worship", fr: "Louange" },
        description: null,
        color: null,
      });
      const position = await teams.insertPosition(tx, {
        teamId: team.id,
        name: { en: "Worship Leader", fr: "Conducteur de louange" },
        isLeadership: true,
        maxHolders: 1,
      });
      return position.id;
    });
  });

  afterAll(async () => {
    await owner.delete(churches).where(inArray(churches.id, [churchA, churchB].filter(Boolean)));
    await owner.delete(user).where(inArray(user.id, userIds));
    await owner.$client.end();
    await app.$client.end();
  });

  it("only returns the current church's people", async () => {
    const result = await withChurch(app, churchA, (tx) =>
      people.listPeople(tx, { scope: "church" }, { limit: 50, offset: 0 }),
    );
    expect(result.rows.map((r) => r.lastName)).toEqual(["Nkosi"]);
  });

  it("returns nothing when no church context is set", async () => {
    const rows = await app.select().from(peopleTable);
    expect(rows).toEqual([]);
  });

  it("refuses writes into another church", async () => {
    await expect(
      withChurch(app, churchA, (tx) =>
        tx.insert(peopleTable).values({ churchId: churchB, firstName: "X", lastName: "Y" }),
      ),
    ).rejects.toThrow();
  });

  it("refuses links to another church's records", async () => {
    await expect(
      withChurch(app, churchA, (tx) =>
        teams.insertAssignment(tx, {
          personId: personA,
          positionId: positionB,
          startsOn: new Date("2026-01-01"),
          endsOn: null,
        }),
      ),
    ).rejects.toThrow();
  });

  it("keeps the audit log append-only", async () => {
    await withChurch(app, churchA, (tx) =>
      audit.recordAudit(tx, {
        actorUserId: userIds[0] ?? null,
        action: "test.recorded",
        entityType: "test",
        entityId: null,
      }),
    );
    await expect(
      withChurch(app, churchA, (tx) =>
        tx.update(auditLog).set({ action: "tampered" }).where(eq(auditLog.action, "test.recorded")),
      ),
    ).rejects.toThrow();
  });

  it("does not let the app role bypass row level security", async () => {
    const [row] = await app.execute<{ rolbypassrls: boolean }>(
      sql`select rolbypassrls from pg_roles where rolname = current_user`,
    );
    expect(row?.rolbypassrls).toBe(false);
  });
});
