import "server-only";
import { type Tx, withChurch } from "@ecclesia/db";
import { can, type Permission } from "@ecclesia/domain/access";
import { notFound } from "next/navigation";
import { type ChurchContext, getChurchContext } from "./context";
import { db } from "./db";

export const readChurch = async <T>(
  permission: Permission | readonly Permission[],
  work: (ctx: ChurchContext & { readonly tx: Tx }) => Promise<T>,
): Promise<T> => {
  const context = await getChurchContext();
  const required = typeof permission === "string" ? [permission] : permission;
  if (!required.some((p) => can(context.actor, p))) notFound();
  return withChurch(db, context.membership.churchId, (tx) => work({ ...context, tx }));
};
