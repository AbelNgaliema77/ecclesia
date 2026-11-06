import "server-only";
import { type Tx, withChurch } from "@ecclesia/db";
import { can, type Permission } from "@ecclesia/domain/access";
import type { DomainError, Result } from "@ecclesia/domain/shared";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import type { ActionState, FieldErrors } from "@/lib/action-state";
import { type ChurchContext, getChurchContext } from "./context";
import { db } from "./db";

export class ActionFailure extends Error {
  constructor(
    readonly code: string,
    readonly fieldErrors?: FieldErrors,
  ) {
    super(code);
  }
}

export const parseInput = <S extends z.ZodType>(schema: S, input: unknown): z.output<S> => {
  const parsed = schema.safeParse(input);
  if (parsed.success) return parsed.data;
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.join(".") || "_form";
    const messages = fieldErrors[key] ?? [];
    messages.push(issue.message);
    fieldErrors[key] = messages;
  }
  throw new ActionFailure("validation", fieldErrors);
};

export const unwrap = <T>(result: Result<T, DomainError>): T => {
  if (result.ok) return result.value;
  throw new ActionFailure(result.error.code);
};

export const ensure = (condition: boolean, code = "forbidden"): void => {
  if (!condition) throw new ActionFailure(code);
};

type ActionOptions = {
  readonly permission: Permission;
  readonly write: boolean;
};

export type ActionContext = ChurchContext & { readonly tx: Tx };

export const runChurchAction = async <T>(
  options: ActionOptions,
  work: (ctx: ActionContext) => Promise<T>,
): Promise<ActionState<T>> => {
  try {
    const context = await getChurchContext();
    ensure(can(context.actor, options.permission));
    if (options.write) ensure(context.accessLevel === "full", "subscription.readOnly");
    const data = await withChurch(db, context.membership.churchId, (tx) =>
      work({ ...context, tx }),
    );
    return { status: "success", data };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ActionFailure) {
      return error.fieldErrors
        ? { status: "error", code: error.code, fieldErrors: error.fieldErrors }
        : { status: "error", code: error.code };
    }
    console.error("Unexpected action failure", error);
    return { status: "error", code: "unexpected" };
  }
};

type FormTree = { [key: string]: string | FormTree };

export const formToNested = (formData: FormData): FormTree => {
  const root: FormTree = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string" || key.startsWith("$ACTION")) continue;
    const path = key.split(".");
    let node = root;
    for (const [index, part] of path.entries()) {
      if (index === path.length - 1) {
        node[part] = value;
      } else {
        const next = node[part];
        if (typeof next === "object") {
          node = next;
        } else {
          const created: FormTree = {};
          node[part] = created;
          node = created;
        }
      }
    }
  }
  return root;
};

export const formToObject = (formData: FormData): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) result[key] = value;
  }
  return result;
};
