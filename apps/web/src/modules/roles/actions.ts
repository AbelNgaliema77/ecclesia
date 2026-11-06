"use server";

import { audit, roles } from "@ecclesia/db/repositories";
import { isPermission, roleInputSchema } from "@ecclesia/domain/access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, formToObject, parseInput, runChurchAction } from "@/server/action";

const GRANT_PREFIX = "grant:";

const readRoleForm = (form: Record<string, string>) => ({
  name: { en: form["name.en"] ?? "", fr: form["name.fr"] ?? "" },
  grants: Object.entries(form)
    .filter(([key, scope]) => key.startsWith(GRANT_PREFIX) && scope !== "")
    .map(([key, scope]) => ({ permission: key.slice(GRANT_PREFIX.length), scope }))
    .filter((grant) => isPermission(grant.permission)),
});

const optionalId = z
  .union([z.literal(""), z.uuid()])
  .optional()
  .transform((value) => value || null);

export async function saveRoleAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "users.manage", write: true },
    async ({ tx, actor }) => {
      const form = formToObject(formData);
      const id = parseInput(optionalId, form.id);
      const input = parseInput(roleInputSchema, readRoleForm(form));
      if (id) {
        const existing = await roles.getRole(tx, id);
        ensure(existing !== null, "notFound");
        ensure(existing?.isSystem === false, "roles.system");
        await roles.updateRole(tx, id, input);
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "role.updated",
          entityType: "role",
          entityId: id,
          before: existing && { name: existing.name, grants: existing.grants },
          after: input,
        });
        return { id };
      }
      const created = await roles.createRole(tx, input);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "role.created",
        entityType: "role",
        entityId: created.id,
        after: input,
      });
      return { id: created.id };
    },
  );
  if (result.status !== "success") return result;
  revalidatePath("/settings/roles");
  redirect("/settings/roles");
}

export async function deleteRoleAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "users.manage", write: true },
    async ({ tx, actor }) => {
      const { id } = parseInput(z.object({ id: z.uuid() }), formToObject(formData));
      const existing = await roles.getRole(tx, id);
      ensure(existing !== null, "notFound");
      ensure(existing?.isSystem === false, "roles.system");
      ensure((await roles.countRoleMembers(tx, id)) === 0, "roles.inUse");
      await roles.deleteRole(tx, id);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "role.deleted",
        entityType: "role",
        entityId: id,
        before: existing && { name: existing.name, grants: existing.grants },
      });
      return null;
    },
  );
  if (result.status !== "success") return result;
  revalidatePath("/settings/roles");
  redirect("/settings/roles");
}
