"use server";

import { audit, settings } from "@ecclesia/db/repositories";
import {
  categorySchema,
  churchSettingsSchema,
  reorder,
  serviceTypeSchema,
} from "@ecclesia/domain/settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, formToNested, formToObject, parseInput, runChurchAction } from "@/server/action";

const optionalId = z
  .union([z.literal(""), z.uuid()])
  .optional()
  .transform((value) => value || null);

export async function updateChurchSettingsAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(churchSettingsSchema, formToObject(formData));
      const before = await settings.getChurch(tx);
      const after = await settings.updateChurch(tx, input);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "church.updated",
        entityType: "church",
        entityId: after?.id ?? null,
        before: before && {
          name: before.name,
          defaultLocale: before.defaultLocale,
          timezone: before.timezone,
          currency: before.currency,
        },
        after: input,
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/", "layout");
  return result;
}

export async function saveServiceTypeAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor }) => {
      const form = formToNested(formData);
      const id = parseInput(optionalId, form.id);
      const input = parseInput(serviceTypeSchema, form);
      if (id) {
        const before = await settings.getServiceType(tx, id);
        ensure(before !== null, "notFound");
        await settings.updateServiceType(tx, id, input);
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "serviceType.updated",
          entityType: "serviceType",
          entityId: id,
          before,
          after: input,
        });
      } else {
        const created = await settings.createServiceType(tx, input);
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "serviceType.created",
          entityType: "serviceType",
          entityId: created.id,
          after: created,
        });
      }
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/services");
  return result;
}

const toggleSchema = z.object({ id: z.uuid(), active: z.enum(["true", "false"]) });

export async function toggleServiceTypeAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor }) => {
      const { id, active } = parseInput(toggleSchema, formToObject(formData));
      const updated = await settings.updateServiceType(tx, id, { isActive: active === "true" });
      ensure(updated !== null, "notFound");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: active === "true" ? "serviceType.shown" : "serviceType.hidden",
        entityType: "serviceType",
        entityId: id,
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/services");
  return result;
}

export async function saveCategoryAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor }) => {
      const form = formToNested(formData);
      const id = parseInput(optionalId, form.id);
      const input = parseInput(categorySchema, form);
      if (id) {
        const before = await settings.getCategory(tx, id);
        ensure(before !== null, "notFound");
        await settings.updateCategory(tx, id, input);
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "category.updated",
          entityType: "attendanceCategory",
          entityId: id,
          before,
          after: input,
        });
      } else {
        const created = await settings.createCategory(tx, input);
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "category.created",
          entityType: "attendanceCategory",
          entityId: created.id,
          after: created,
        });
      }
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/categories");
  return result;
}

export async function toggleCategoryAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor }) => {
      const { id, active } = parseInput(toggleSchema, formToObject(formData));
      const updated = await settings.updateCategory(tx, id, { isActive: active === "true" });
      ensure(updated !== null, "notFound");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: active === "true" ? "category.shown" : "category.hidden",
        entityType: "attendanceCategory",
        entityId: id,
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/categories");
  return result;
}

const moveSchema = z.object({ id: z.uuid(), direction: z.enum(["up", "down"]) });

export async function moveCategoryAction(
  id: string,
  direction: "up" | "down",
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(moveSchema, { id, direction });
      const active = (await settings.listAllCategories(tx)).filter((c) => c.isActive);
      const next = reorder(active, input.id, input.direction);
      await settings.setCategoryOrder(
        tx,
        next.map((c) => c.id),
      );
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "category.reordered",
        entityType: "attendanceCategory",
        entityId: input.id,
        after: next.map((c) => c.id),
      });
      return null;
    },
  );
  if (result.status === "success") revalidatePath("/settings/categories");
  return result;
}
