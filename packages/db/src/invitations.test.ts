import { createHash, randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, withChurch } from "./client";
import { invitations, members, provisioning } from "./repositories";
import { churches, user } from "./schema";
import "./scripts/env";

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("invitations and members", () => {
  const owner = createDatabase(ownerUrl ?? "", { maxConnections: 2 });
  const app = createDatabase(appUrl ?? "", { maxConnections: 4 });
  const suffix = randomUUID().slice(0, 8);
  const userIds = [`inv-a-${suffix}`, `inv-b-${suffix}`, `inv-c-${suffix}`];
  const token = randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  let churchA = "";
  let churchB = "";
  let usherRole = "";

  beforeAll(async () => {
    await owner
      .insert(user)
      .values(userIds.map((id) => ({ id, name: id, email: `${id}@example.test` })));
    const a = await provisioning.provisionChurch(app, {
      name: "Church A",
      slug: `inv-a-${suffix}`,
      defaultLocale: "en",
      ownerUserId: userIds[0] ?? "",
    });
    const b = await provisioning.provisionChurch(app, {
      name: "Church B",
      slug: `inv-b-${suffix}`,
      defaultLocale: "fr",
      ownerUserId: userIds[1] ?? "",
    });
    churchA = a.church.id;
    churchB = b.church.id;
    usherRole = a.roles.find((r) => r.key === "usher")?.id ?? "";
    await withChurch(app, churchA, (tx) =>
      invitations.createInvitation(tx, {
        email: `${userIds[2]}@example.test`,
        roleId: usherRole,
        personId: null,
        tokenHash,
        invitedBy: userIds[0] ?? "",
        expiresAt: new Date(Date.now() + 86_400_000),
      }),
    );
  });

  afterAll(async () => {
    await owner.delete(churches).where(inArray(churches.id, [churchA, churchB].filter(Boolean)));
    await owner.delete(user).where(inArray(user.id, userIds));
    await owner.$client.end();
    await app.$client.end();
  });

  it("finds the church for a token without exposing invitation rows", async () => {
    expect(await invitations.churchForInvitationToken(app, tokenHash)).toBe(churchA);
    expect(await invitations.churchForInvitationToken(app, "nope")).toBeNull();
  });

  it("hides invitations from other churches", async () => {
    const fromB = await withChurch(app, churchB, (tx) =>
      invitations.findInvitationByTokenHash(tx, tokenHash),
    );
    expect(fromB).toBeNull();
    const fromA = await withChurch(app, churchA, (tx) =>
      invitations.findInvitationByTokenHash(tx, tokenHash),
    );
    expect(fromA?.invitation.roleId).toBe(usherRole);
  });

  it("allows only one open invitation per email", async () => {
    await expect(
      withChurch(app, churchA, (tx) =>
        invitations.createInvitation(tx, {
          email: `${userIds[2]}@example.test`,
          roleId: usherRole,
          personId: null,
          tokenHash: `${tokenHash}-2`,
          invitedBy: userIds[0] ?? "",
          expiresAt: new Date(Date.now() + 86_400_000),
        }),
      ),
    ).rejects.toThrow();
  });

  it("lists only the current church's members", async () => {
    const list = await withChurch(app, churchA, (tx) => members.listMembers(tx));
    expect(list.map((m) => m.userId)).toEqual([userIds[0]]);
  });

  it("accepts an invitation into a membership once", async () => {
    await withChurch(app, churchA, async (tx) => {
      const found = await invitations.findInvitationByTokenHash(tx, tokenHash);
      if (!found) throw new Error("missing");
      await members.addMember(tx, { userId: userIds[2] ?? "", roleId: usherRole, personId: null });
      expect(
        await invitations.markInvitationAccepted(tx, found.invitation.id, userIds[2] ?? ""),
      ).not.toBeNull();
      expect(
        await invitations.markInvitationAccepted(tx, found.invitation.id, userIds[2] ?? ""),
      ).toBeNull();
    });
    const list = await withChurch(app, churchA, (tx) => members.listMembers(tx));
    expect(list).toHaveLength(2);
  });

  it("cannot change a membership in another church", async () => {
    const [memberB] = await withChurch(app, churchB, (tx) => members.listMembers(tx));
    const result = await withChurch(app, churchA, (tx) =>
      members.removeMember(tx, memberB?.membershipId ?? ""),
    );
    expect(result).toBeNull();
  });
});
