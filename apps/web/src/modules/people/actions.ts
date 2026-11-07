"use server";

import { audit, people, teams } from "@ecclesia/db/repositories";
import { broadestScope, can } from "@ecclesia/domain/access";
import { personInputSchema } from "@ecclesia/domain/people";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, formToObject, parseInput, runChurchAction } from "@/server/action";

const idSchema = z.uuid();

const teamIdSchema = z
  .union([z.literal(""), z.uuid()])
  .optional()
  .transform((value) => value || null);

const startOfToday = () => new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

const toPersonInput = (form: Record<string, string>) => ({
  ...form,
  gender: form.gender || null,
  dateOfBirth: form.dateOfBirth || null,
});

export async function createPersonAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "people.write", write: true },
    async ({ tx, actor }) => {
      const scope = broadestScope(actor.grants, "people.write");
      ensure(scope !== "self");
      const form = formToObject(formData);
      const input = parseInput(personInputSchema, toPersonInput(form));
      const teamId = parseInput(teamIdSchema, form.teamId);
      ensure(scope === "church" || (teamId !== null && actor.ledTeamIds.includes(teamId)));
      const target = teamId
        ? (await teams.listImportTargets(tx)).find((entry) => entry.teamId === teamId)
        : null;
      ensure(teamId === null || Boolean(target?.positionId), "people.teamFull");
      const person = await people.insertPerson(tx, input);
      if (target?.positionId) {
        await teams.insertAssignment(tx, {
          personId: person.id,
          positionId: target.positionId,
          startsOn: startOfToday(),
          endsOn: null,
        });
      }
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "person.created",
        entityType: "person",
        entityId: person.id,
        after: person,
      });
      return { id: person.id };
    },
  );
  if (result.status === "success") {
    revalidatePath("/people");
    revalidatePath("/teams", "layout");
  }
  return result;
}

export async function updatePersonAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "people.write", write: true },
    async ({ tx, actor }) => {
      const form = formToObject(formData);
      const id = parseInput(idSchema, form.id);
      const existing = await people.getPerson(tx, id);
      ensure(existing !== null, "notFound");
      if (!existing) return { id };
      const teamIds = await people.personTeamIds(tx, id);
      ensure(can(actor, "people.write", { personId: id, teamIds }));
      const input = parseInput(personInputSchema, toPersonInput(form));
      const updated = await people.updatePerson(tx, id, input);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "person.updated",
        entityType: "person",
        entityId: id,
        before: existing,
        after: updated,
      });
      return { id };
    },
  );
  if (result.status === "success") {
    revalidatePath("/people");
    revalidatePath(`/people/${result.data.id}`);
  }
  return result;
}

export async function deletePersonAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "people.write", write: true },
    async ({ tx, actor }) => {
      const id = parseInput(idSchema, formToObject(formData).id);
      const existing = await people.getPerson(tx, id);
      ensure(existing !== null, "notFound");
      const teamIds = await people.personTeamIds(tx, id);
      ensure(can(actor, "people.write", { personId: id, teamIds }));
      ensure(actor.personId !== id, "people.deleteSelf");
      await people.softDeletePerson(tx, id);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "person.deleted",
        entityType: "person",
        entityId: id,
        before: existing,
      });
      return null;
    },
  );
  if (result.status !== "success") return result;
  revalidatePath("/people");
  revalidatePath("/teams", "layout");
  redirect("/people");
}
