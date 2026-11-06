"use server";

import { attendance, audit } from "@ecclesia/db/repositories";
import { headcountSubmissionSchema } from "@ecclesia/domain/attendance";
import { zonedDateTimeToUtc } from "@ecclesia/domain/shared";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, formToObject, parseInput, runChurchAction } from "@/server/action";

const startSchema = z.object({
  serviceTypeId: z.uuid(),
  date: z.iso.date(),
});

export async function startServiceAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "attendance.capture", write: true },
    async ({ tx, actor, membership }) => {
      const input = parseInput(startSchema, formToObject(formData));
      const serviceTypes = await attendance.listServiceTypes(tx);
      const serviceType = serviceTypes.find((s) => s.id === input.serviceTypeId);
      ensure(serviceType !== undefined, "notFound");
      const occursAt = zonedDateTimeToUtc(
        input.date,
        serviceType?.startsAt ?? "09:00",
        membership.timezone,
      );
      const { service, created } = await attendance.findOrCreateService(tx, {
        serviceTypeId: input.serviceTypeId,
        occursAt,
        title: null,
      });
      if (created) {
        await audit.recordAudit(tx, {
          actorUserId: actor.userId,
          action: "service.created",
          entityType: "service",
          entityId: service.id,
          after: service,
        });
      }
      return { id: service.id };
    },
  );
  if (result.status !== "success") return result;
  redirect(`/attendance/${result.data.id}`);
}

export async function saveHeadcountAction(
  _previous: ActionState<{ total: number }>,
  formData: FormData,
): Promise<ActionState<{ total: number }>> {
  const result = await runChurchAction(
    { permission: "attendance.capture", write: true },
    async ({ tx, actor }) => {
      const form = formToObject(formData);
      const entries = Object.entries(form)
        .filter(([key]) => key.startsWith("count:"))
        .map(([key, value]) => ({ categoryId: key.slice(6), count: value === "" ? "0" : value }));
      const input = parseInput(headcountSubmissionSchema, { serviceId: form.serviceId, entries });

      const service = await attendance.getServiceWithHeadcounts(tx, input.serviceId);
      ensure(service !== null, "notFound");
      const categories = await attendance.listAttendanceCategories(tx);
      const known = new Set(categories.map((c) => c.id));
      ensure(
        input.entries.every((e) => known.has(e.categoryId)),
        "validation",
      );

      const { before } = await attendance.saveHeadcounts(
        tx,
        input.serviceId,
        input.entries,
        actor.userId,
      );
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "headcount.saved",
        entityType: "service",
        entityId: input.serviceId,
        before,
        after: input.entries,
      });
      return { total: input.entries.reduce((sum, e) => sum + e.count, 0) };
    },
  );
  if (result.status === "success") {
    revalidatePath("/attendance");
    revalidatePath("/");
  }
  return result;
}
