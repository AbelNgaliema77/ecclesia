"use server";

import { audit, people } from "@ecclesia/db/repositories";
import { broadestScope, can } from "@ecclesia/domain/access";
import { personInputSchema, transitionStatus } from "@ecclesia/domain/people";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, formToObject, parseInput, runChurchAction, unwrap } from "@/server/action";

const idSchema = z.uuid();

const toPersonInput = (form: Record<string, string>) => ({
  ...form,
  gender: form.gender || null,
  dateOfBirth: form.dateOfBirth || null,
  firstVisitOn: form.firstVisitOn || null,
  householdId: form.householdId || null,
});

export async function createPersonAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "people.write", write: true },
    async ({ tx, actor }) => {
      ensure(broadestScope(actor.grants, "people.write") !== "self");
      const input = parseInput(personInputSchema, toPersonInput(formToObject(formData)));
      const person = await people.insertPerson(tx, input, actor.userId);
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
  if (result.status === "success") revalidatePath("/people");
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
      unwrap(transitionStatus(existing.status, input.status));
      const updated = await people.updatePerson(tx, id, input, existing.status, actor.userId);
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
