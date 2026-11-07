"use server";

import { audit, finance, giving, people } from "@ecclesia/db/repositories";
import { can } from "@ecclesia/domain/access";
import {
  donorProfileInputSchema,
  giftInputSchema,
  voidReasonSchema,
} from "@ecclesia/domain/finance";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ActionFailure, ensure, formToObject, parseInput, runChurchAction } from "@/server/action";
import { churchToday, ensureOpen } from "./context";

const idSchema = z.uuid();

const refresh = () => {
  revalidatePath("/finance", "layout");
};

export async function recordGiftAction(
  _previous: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const input = parseInput(giftInputSchema(churchToday(ctx)), formToObject(formData));
      ensure((await finance.getFund(tx, input.fundId))?.isActive === true, "finance.fundInactive");
      if (input.personId) ensure((await people.getPerson(tx, input.personId)) !== null, "notFound");
      await ensureOpen(tx, input.receivedOn);
      const [gift] = await giving.insertGifts(
        tx,
        [
          {
            fundId: input.fundId,
            personId: input.personId,
            method: input.method,
            amountCents: input.amount,
            receivedOn: input.receivedOn,
            reference: input.reference,
          },
        ],
        actor.userId,
      );
      ensure(gift !== undefined, "unexpected");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "gift.recorded",
        entityType: "gift",
        entityId: gift?.id ?? null,
        after: input,
      });
      return { id: gift?.id ?? "" };
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function voidGiftAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async ({ tx, actor }) => {
      const values = formToObject(formData);
      const id = parseInput(idSchema, values.id);
      const reason = parseInput(z.object({ reason: voidReasonSchema }), {
        reason: values.reason,
      }).reason;
      const gift = await giving.getGift(tx, id);
      ensure(gift !== null, "notFound");
      ensure(gift?.voidedAt === null, "finance.alreadyVoid");
      await ensureOpen(tx, gift?.receivedOn ?? "");
      const voided = await giving.voidGift(tx, id, actor.userId, reason);
      ensure(voided !== null, "finance.alreadyVoid");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "gift.voided",
        entityType: "gift",
        entityId: id,
        before: gift,
        after: { reason },
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function saveDonorAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async ({ tx, actor }) => {
      ensure(can(actor, "giving.readIndividual"));
      const input = parseInput(donorProfileInputSchema, formToObject(formData));
      ensure((await people.getPerson(tx, input.personId)) !== null, "notFound");
      if (input.givingNumber) {
        const owner = await giving.givingNumberOwner(tx, input.givingNumber);
        if (owner !== null && owner !== input.personId) {
          throw new ActionFailure("validation", { givingNumber: ["finance.givingNumberTaken"] });
        }
      }
      const before = await giving.getDonorProfile(tx, input.personId);
      await giving.saveDonorProfile(tx, input);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "donor.updated",
        entityType: "person",
        entityId: input.personId,
        before,
        after: input,
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export type PersonOption = {
  readonly id: string;
  readonly name: string;
  readonly givingNumber: string | null;
};

export async function searchGiversAction(query: string): Promise<PersonOption[]> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: false },
    async ({ tx, actor }) => {
      ensure(can(actor, "giving.readIndividual"));
      const term = z.string().trim().max(60).parse(query);
      if (term.length < 2) return [];
      const [found, numbers] = await Promise.all([
        people.listPeople(tx, { scope: "church" }, { search: term, limit: 8, offset: 0 }),
        giving.donorNumbers(tx),
      ]);
      const byNumber = numbers.find((n) => n.givingNumber?.toUpperCase() === term.toUpperCase());
      const rows = found.rows.map((person) => ({
        id: person.id,
        name: `${person.preferredName ?? person.firstName} ${person.lastName}`,
        givingNumber: numbers.find((n) => n.personId === person.id)?.givingNumber ?? null,
      }));
      if (byNumber && !rows.some((row) => row.id === byNumber.personId)) {
        const person = await people.getPerson(tx, byNumber.personId);
        if (person) {
          rows.unshift({
            id: person.id,
            name: `${person.preferredName ?? person.firstName} ${person.lastName}`,
            givingNumber: byNumber.givingNumber,
          });
        }
      }
      return rows;
    },
  );
  return result.status === "success" ? result.data : [];
}
