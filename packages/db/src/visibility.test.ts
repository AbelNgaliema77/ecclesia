import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, withChurch } from "./client";
import { people, provisioning, teams } from "./repositories";
import { churches, user } from "./schema";
import "./scripts/env";

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

const person = (firstName: string, lastName: string) => ({
  firstName,
  lastName,
  preferredName: null,
  gender: null,
  email: null,
  phone: null,
  dateOfBirth: null,
  status: "member" as const,
  firstVisitOn: null,
  householdId: null,
  notes: null,
});

describe.skipIf(!appUrl || !ownerUrl)("team-scoped people visibility", () => {
  const owner = createDatabase(ownerUrl ?? "", { maxConnections: 1 });
  const app = createDatabase(appUrl ?? "", { maxConnections: 2 });
  const userId = `vis-${randomUUID().slice(0, 8)}`;
  let churchId = "";
  let teamId = "";
  let leaderId = "";

  beforeAll(async () => {
    await owner.insert(user).values({ id: userId, name: userId, email: `${userId}@example.test` });
    churchId = (
      await provisioning.provisionChurch(app, {
        name: "Vis",
        slug: userId,
        defaultLocale: "en",
        ownerUserId: userId,
      })
    ).church.id;
    await withChurch(app, churchId, async (tx) => {
      const leader = await people.insertPerson(tx, person("Lerato", "Leader"), null);
      const member = await people.insertPerson(tx, person("Musa", "Member"), null);
      await people.insertPerson(tx, person("Outside", "Person"), null);
      const team = await teams.insertTeam(tx, {
        name: { en: "Media", fr: "Médias" },
        description: null,
        color: null,
      });
      const lead = await teams.insertPosition(tx, {
        teamId: team.id,
        name: { en: "Lead", fr: "Lead" },
        isLeadership: true,
        maxHolders: 1,
      });
      const crew = await teams.insertPosition(tx, {
        teamId: team.id,
        name: { en: "Crew", fr: "Équipe" },
        isLeadership: false,
        maxHolders: null,
      });
      const start = new Date("2025-01-01T00:00:00Z");
      await teams.insertAssignment(tx, {
        personId: leader.id,
        positionId: lead.id,
        startsOn: start,
        endsOn: null,
      });
      await teams.insertAssignment(tx, {
        personId: member.id,
        positionId: crew.id,
        startsOn: start,
        endsOn: null,
      });
      teamId = team.id;
      leaderId = leader.id;
    });
  });

  afterAll(async () => {
    await owner.delete(churches).where(eq(churches.id, churchId));
    await owner.delete(user).where(eq(user.id, userId));
    await owner.$client.end();
    await app.$client.end();
  });

  it("shows a team leader only their team members and themselves", async () => {
    const result = await withChurch(app, churchId, (tx) =>
      people.listPeople(
        tx,
        { scope: "team", teamIds: [teamId], personId: leaderId },
        { limit: 50, offset: 0 },
      ),
    );
    expect(result.rows.map((r) => r.lastName).sort()).toEqual(["Leader", "Member"]);
    expect(result.total).toBe(2);
  });

  it("shows only the person themselves for self scope", async () => {
    const result = await withChurch(app, churchId, (tx) =>
      people.listPeople(tx, { scope: "self", personId: leaderId }, { limit: 50, offset: 0 }),
    );
    expect(result.rows.map((r) => r.lastName)).toEqual(["Leader"]);
  });

  it("filters workers and leaders and tags their teams", async () => {
    await withChurch(app, churchId, async (tx) => {
      const workers = await people.listPeople(
        tx,
        { scope: "church" },
        { filter: "workers", limit: 50, offset: 0 },
      );
      expect(workers.rows.map((r) => r.lastName).sort()).toEqual(["Leader", "Member"]);
      const leaders = await people.listPeople(
        tx,
        { scope: "church" },
        { filter: "leaders", limit: 50, offset: 0 },
      );
      expect(leaders.rows.map((r) => r.lastName)).toEqual(["Leader"]);
      expect(leaders.rows[0]?.serving).toEqual([
        { teamId, teamName: { en: "Media", fr: "Médias" }, isLeader: true },
      ]);
      const all = await people.listPeople(tx, { scope: "church" }, { limit: 50, offset: 0 });
      expect(all.rows.find((r) => r.lastName === "Person")?.serving).toEqual([]);
    });
  });

  it("removes a deleted person from lists and ends their assignments", async () => {
    await withChurch(app, churchId, async (tx) => {
      const extra = await people.insertPerson(tx, person("Temp", "Worker"), null);
      const team = await teams.getTeamDetail(tx, teamId);
      const crew = team?.positions.find((p) => !p.isLeadership);
      if (!crew) throw new Error("missing crew");
      await teams.insertAssignment(tx, {
        personId: extra.id,
        positionId: crew.id,
        startsOn: new Date("2025-02-01T00:00:00Z"),
        endsOn: null,
      });
      expect(await people.softDeletePerson(tx, extra.id)).not.toBeNull();
      expect(await people.softDeletePerson(tx, extra.id)).toBeNull();
      const workers = await people.listPeople(
        tx,
        { scope: "church" },
        { filter: "workers", limit: 50, offset: 0 },
      );
      expect(workers.rows.map((r) => r.lastName)).not.toContain("Worker");
      const after = await teams.getTeamDetail(tx, teamId);
      expect(after?.positions.flatMap((p) => p.holders.map((h) => h.lastName))).not.toContain(
        "Worker",
      );
    });
  });

  it("bulk inserts imported people with status history and lists import targets", async () => {
    await withChurch(app, churchId, async (tx) => {
      const inserted = await people.insertPeople(
        tx,
        [person("Bulk", "One"), person("Bulk", "Two")].map((p) => ({ ...p, status: "visitor" })),
        null,
      );
      expect(inserted).toHaveLength(2);
      const identities = await people.identityRecords(tx);
      expect(identities.map((p) => p.lastName)).toEqual(expect.arrayContaining(["One", "Two"]));
      const history = await people.statusHistory(tx, inserted[0]?.id ?? "");
      expect(history.map((h) => h.toStatus)).toEqual(["visitor"]);
      const targets = await teams.listImportTargets(tx);
      const media = targets.find((t) => t.teamId === teamId);
      expect(media?.positionId).not.toBeNull();
    });
  });

  it("derives led teams from active leadership assignments", async () => {
    const { access } = await import("./repositories");
    const led = await withChurch(app, churchId, (tx) =>
      access.loadLedTeamIds(tx, leaderId, new Date()),
    );
    expect(led).toEqual([teamId]);
  });
});
