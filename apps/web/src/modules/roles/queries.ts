import "server-only";
import { roles } from "@ecclesia/db/repositories";
import { notFound } from "next/navigation";
import { readChurch } from "@/server/queries";

export const loadRoles = async () =>
  readChurch("users.manage", async ({ tx, accessLevel }) => ({
    roles: await roles.listRoles(tx),
    readOnly: accessLevel !== "full",
  }));

export const loadRole = async (id: string) =>
  readChurch("users.manage", async ({ tx, accessLevel }) => {
    const role = await roles.getRole(tx, id);
    if (!role) notFound();
    return {
      role,
      members: await roles.countRoleMembers(tx, id),
      readOnly: accessLevel !== "full",
    };
  });
