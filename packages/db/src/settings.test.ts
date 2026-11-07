import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, withChurch } from "./client";
import { provisioning, roles, settings, teams } from "./repositories";
import { churches, user } from "./schema";
import "./scripts/env";

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("settings and team repositories", () => {
  const owner = createDatabase(ownerUrl ?? "", { maxConnections: 1 });
  const app = createDatabase(appUrl ?? "", { maxConnections: 2 });
  const userId = `settings-${randomUUID().slice(0, 8)}`;
  let churchId = "";

  beforeAll(async () => {
    await owner.insert(user).values({ id: userId, name: userId, email: `${userId}@example.test` });
    const created = await provisioning.provisionChurch(app, {
      name: "Settings Church",
      slug: userId,
      defaultLocale: "en",
      ownerUserId: userId,
    });
    churchId = created.church.id;
  });

  afterAll(async () => {
    await owner.delete(churches).where(eq(churches.id, churchId));
    await owner.delete(user).where(eq(user.id, userId));
    await owner.$client.end();
    await app.$client.end();
  });

  it("lists hidden service types after active ones", async () => {
    await withChurch(app, churchId, async (tx) => {
      const [first] = await settings.listAllServiceTypes(tx);
      if (!first) throw new Error("missing");
      await settings.updateServiceType(tx, first.id, { isActive: false });
      const list = await settings.listAllServiceTypes(tx);
      expect(list.at(-1)?.id).toBe(first.id);
    });
  });

  it("appends and reorders categories", async () => {
    await withChurch(app, churchId, async (tx) => {
      const created = await settings.createCategory(tx, {
        name: { en: "Elders", fr: "Anciens" },
        color: "#008300",
      });
      const before = await settings.listAllCategories(tx);
      expect(before.at(-1)?.id).toBe(created.id);
      await settings.setCategoryOrder(tx, [
        created.id,
        ...before.filter((c) => c.id !== created.id).map((c) => c.id),
      ]);
      const after = await settings.listAllCategories(tx);
      expect(after[0]?.id).toBe(created.id);
    });
  });

  it("stores the brand theme and logo per church", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    await withChurch(app, churchId, async (tx) => {
      await settings.setBrandTheme(tx, "ocean");
      const version = await settings.saveLogo(tx, { contentType: "image/png", data: png });
      const church = await settings.getChurch(tx);
      expect(church?.branding).toEqual({ theme: "ocean", logoVersion: version });
      const logo = await settings.getLogo(tx);
      expect(logo?.contentType).toBe("image/png");
      expect(Array.from(logo?.data ?? [])).toEqual(Array.from(png));
    });
    const otherId = randomUUID();
    await owner
      .insert(churches)
      .values({ id: otherId, slug: `other-${otherId.slice(0, 8)}`, name: "Other" });
    await withChurch(app, otherId, async (tx) => {
      expect(await settings.getLogo(tx)).toBeNull();
    });
    await owner.delete(churches).where(eq(churches.id, otherId));
    await withChurch(app, churchId, async (tx) => {
      await settings.removeLogo(tx);
      await settings.setBrandTheme(tx, null);
      expect(await settings.getLogo(tx)).toBeNull();
      expect((await settings.getChurch(tx))?.branding).toEqual({ theme: null, logoVersion: null });
    });
  });

  it("lists built-in roles with member counts", async () => {
    const list = await withChurch(app, churchId, (tx) => roles.listRoles(tx));
    expect(list.every((r) => r.isSystem)).toBe(true);
    expect(list.find((r) => r.key === "churchAdmin")?.members).toBe(1);
  });

  it("returns a team with its positions and active assignments", async () => {
    await withChurch(app, churchId, async (tx) => {
      const team = await teams.insertTeam(tx, {
        name: { en: "Media", fr: "Médias" },
        description: null,
        color: null,
      });
      await teams.insertPosition(tx, {
        teamId: team.id,
        name: { en: "Lead", fr: "Lead" },
        isLeadership: true,
        maxHolders: 1,
      });
      const detail = await teams.getTeamDetail(tx, team.id);
      expect(detail?.positions).toHaveLength(1);
      expect(await teams.countTeamAssignments(tx, team.id)).toBe(0);
    });
  });
});
