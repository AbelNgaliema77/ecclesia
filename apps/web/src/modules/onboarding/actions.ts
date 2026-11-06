"use server";

import { provisioning } from "@ecclesia/db/repositories";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { LOCALE_COOKIE, LOCALES } from "@/i18n/config";
import type { ActionState } from "@/lib/action-state";
import { ActionFailure, formToObject, parseInput } from "@/server/action";
import { ACTIVE_CHURCH_COOKIE, requireSession } from "@/server/context";
import { db } from "@/server/db";

const schema = z.object({
  name: z.string().trim().min(2, "required").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "required")
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "generic"),
  defaultLocale: z.enum(LOCALES),
});

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "cause" in error &&
  typeof error.cause === "object" &&
  error.cause !== null &&
  "code" in error.cause &&
  error.cause.code === "23505";

export async function createChurchAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  let churchId: string;
  try {
    const input = parseInput(schema, formToObject(formData));
    const result = await provisioning.provisionChurch(db, {
      ...input,
      ownerUserId: session.user.id,
    });
    churchId = result.church.id;
    const store = await cookies();
    store.set(ACTIVE_CHURCH_COOKIE, churchId, { httpOnly: true, sameSite: "lax", path: "/" });
    store.set(LOCALE_COOKIE, input.defaultLocale, { sameSite: "lax", path: "/" });
  } catch (error) {
    if (error instanceof ActionFailure) {
      return {
        status: "error",
        code: error.code,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      };
    }
    if (isUniqueViolation(error)) {
      return { status: "error", code: "validation", fieldErrors: { slug: ["slugTaken"] } };
    }
    console.error("Church provisioning failed", error);
    return { status: "error", code: "unexpected" };
  }
  redirect("/");
}
