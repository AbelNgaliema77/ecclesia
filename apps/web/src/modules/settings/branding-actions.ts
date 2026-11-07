"use server";

import { audit, settings } from "@ecclesia/db/repositories";
import {
  brandThemeSchema,
  checkLogo,
  DEFAULT_BRAND_THEME,
  MAX_LOGO_BYTES,
} from "@ecclesia/domain/settings";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { ActionFailure, formToObject, parseInput, runChurchAction } from "@/server/action";

const refresh = () => revalidatePath("/", "layout");

export async function saveBrandThemeAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor, membership }) => {
      const theme = parseInput(brandThemeSchema, formToObject(formData).theme);
      await settings.setBrandTheme(tx, theme === DEFAULT_BRAND_THEME ? null : theme);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "church.themeChanged",
        entityType: "church",
        entityId: membership.churchId,
        after: { theme },
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function uploadLogoAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor, membership }) => {
      const file = formData.get("logo");
      if (!(file instanceof File) || file.size === 0) throw new ActionFailure("branding.logoEmpty");
      if (file.size > MAX_LOGO_BYTES) throw new ActionFailure("branding.logoTooLarge");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const check = checkLogo(bytes);
      if (!check.ok) throw new ActionFailure(check.code);
      const version = await settings.saveLogo(tx, { contentType: check.type, data: bytes });
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "church.logoUpdated",
        entityType: "church",
        entityId: membership.churchId,
        after: { contentType: check.type, bytes: bytes.byteLength, version },
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function removeLogoAction(
  _previous: ActionState<null>,
  _formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "settings.manage", write: true },
    async ({ tx, actor, membership }) => {
      await settings.removeLogo(tx);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "church.logoRemoved",
        entityType: "church",
        entityId: membership.churchId,
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}
