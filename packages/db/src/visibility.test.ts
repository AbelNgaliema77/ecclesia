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

  it("derives led teams from active leadership assignments", async () => {
    const { access } = await import("./repositories");
    const led = await withChurch(app, churchId, (tx) =>
      access.loadLedTeamIds(tx, leaderId, new Date()),
    );
    expect(led).toEqual([teamId]);
  });
});
