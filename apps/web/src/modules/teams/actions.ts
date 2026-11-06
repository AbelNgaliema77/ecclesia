"use server";

import { audit, people, teams } from "@ecclesia/db/repositories";
import { type Actor, broadestScope, can } from "@ecclesia/domain/access";
import {
  assignmentInputSchema,
  endAssignmentInputSchema,
  endAssignmentOn,
  positionInputSchema,
  teamInputSchema,
  validateAssignment,
} from "@ecclesia/domain/teams";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import {
  ensure,
  formToNested,
  formToObject,
  parseInput,
  runChurchAction,
  unwrap,
} from "@/server/action";

const optionalId = z
  .union([z.literal(""), z.uuid()])
  .optional()
  .transform((value) => value || null);

const canManageTeam = (actor: Actor, teamId: string) =>
  can(actor, "teams.write", { teamIds: [teamId] });

const refresh = (teamId?: string) => {
  revalidatePath("/teams");
  if (teamId) revalidatePath(`/teams/${teamId}`);
};

export async function saveTeamAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "teams.write", write: true },
    async ({ tx, actor }) => {
      const form = formToNested(formData);
      const id = parseInput(optionalId, form.id);
      const input = parseInput(teamInputSchema, form);
      if (id) {
        ensure(canManageTeam(actor, id));
        const before = await teams.getTeam(tx, id);
        ensure(before !== null, "notFound");
        await teams.updateTeam(tx, id, input);
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "team.updated",
          entityType: "team",
          entityId: id,
          before,
          after: input,
        });
        return { id };
      }
      ensure(broadestScope(actor.grants, "teams.write") === "church");
      const created = await teams.insertTeam(tx, input);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "team.created",
        entityType: "team",
        entityId: created.id,
        after: created,
      });
      return { id: created.id };
    },
  );
  if (result.status === "success") refresh(result.data.id);
  return result;
}

const idSchema = z.object({ id: z.uuid() });

export async function deleteTeamAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "teams.write", write: true },
    async ({ tx, actor }) => {
      const { id } = parseInput(idSchema, formToObject(formData));
      ensure(broadestScope(actor.grants, "teams.write") === "church");
      const team = await teams.getTeam(tx, id);
      ensure(team !== null, "notFound");
      ensure((await teams.countTeamAssignments(tx, id)) === 0, "teams.hasHistory");
      await teams.deleteTeam(tx, id);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "team.deleted",
        entityType: "team",
        entityId: id,
        before: team,
      });
      return null;
    },
  );
  if (result.status !== "success") return result;
  refresh();
  redirect("/teams");
}

export async function savePositionAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  let teamId = "";
  const result = await runChurchAction(
    { permission: "teams.write", write: true },
    async ({ tx, actor }) => {
      const form = formToNested(formData);
      const id = parseInput(optionalId, form.id);
      teamId = parseInput(z.uuid(), form.teamId);
      ensure(canManageTeam(actor, teamId));
      ensure((await teams.getTeam(tx, teamId)) !== null, "notFound");
      const input = parseInput(positionInputSchema, form);
      if (id) {
        const before = await teams.getPosition(tx, id);
        ensure(before?.teamId === teamId, "notFound");
        await teams.updatePosition(tx, id, input);
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "position.updated",
          entityType: "position",
          entityId: id,
          before,
          after: input,
        });
      } else {
        const created = await teams.insertPosition(tx, { ...input, teamId });
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "position.created",
          entityType: "position",
          entityId: created.id,
          after: created,
        });
      }
      return null;
    },
  );
  if (result.status === "success") refresh(teamId);
  return result;
}

export async function deletePositionAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  let teamId = "";
  const result = await runChurchAction(
    { permission: "teams.write", write: true },
    async ({ tx, actor }) => {
      const { id } = parseInput(idSchema, formToObject(formData));
      const position = await teams.getPosition(tx, id);
      ensure(position !== null, "notFound");
      if (!position) return null;
      teamId = position.teamId;
      ensure(canManageTeam(actor, position.teamId));
      ensure((await teams.countPositionAssignments(tx, id)) === 0, "positions.hasHistory");
      await teams.deletePosition(tx, id);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "position.deleted",
        entityType: "position",
        entityId: id,
        before: position,
      });
      return null;
    },
  );
  if (result.status === "success") refresh(teamId);
  return result;
}

export async function assignPersonAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  let teamId = "";
  const result = await runChurchAction(
    { permission: "teams.write", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(assignmentInputSchema, formToObject(formData));
      const position = await teams.getPosition(tx, input.positionId);
      ensure(position !== null, "notFound");
      if (!position) return null;
      teamId = position.teamId;
      ensure(canManageTeam(actor, position.teamId));
      ensure((await people.getPerson(tx, input.personId)) !== null, "notFound");
      const candidate = unwrap(
        validateAssignment(
          {
            personId: input.personId,
            positionId: input.positionId,
            startsOn: input.startsOn,
            endsOn: null,
          },
          await teams.listAssignmentPeriods(tx, input.positionId),
          { positionId: position.id, maxHolders: position.maxHolders },
        ),
      );
      const created = await teams.insertAssignment(tx, candidate);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "assignment.created",
        entityType: "assignment",
        entityId: created.id,
        after: created,
      });
      return null;
    },
  );
  if (result.status === "success") refresh(teamId);
  return result;
}

export async function endAssignmentAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  let teamId = "";
  const result = await runChurchAction(
    { permission: "teams.write", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(endAssignmentInputSchema, formToObject(formData));
      const assignment = await teams.getAssignmentWithTeam(tx, input.assignmentId);
      ensure(assignment !== null, "notFound");
      if (!assignment) return null;
      teamId = assignment.teamId;
      ensure(canManageTeam(actor, assignment.teamId));
      const endsOn = unwrap(endAssignmentOn(assignment, input.endsOn));
      await teams.setAssignmentEnd(tx, assignment.id, endsOn);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "assignment.ended",
        entityType: "assignment",
        entityId: assignment.id,
        before: assignment,
        after: { endsOn },
      });
      return null;
    },
  );
  if (result.status === "success") refresh(teamId);
  return result;
}
