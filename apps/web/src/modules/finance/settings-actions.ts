"use server";

import { audit, finance, teams } from "@ecclesia/db/repositories";
import {
  expenseCategoryInputSchema,
  fundInputSchema,
  optionalAmountSchema,
} from "@ecclesia/domain/finance";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import {
  ActionFailure,
  ensure,
  formToNested,
  formToObject,
  parseInput,
  runChurchAction,
} from "@/server/action";

const idSchema = z.uuid();

const refresh = () => revalidatePath("/", "layout");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

const controlsSchema = z.object({
  secondApprovalAbove: optionalAmountSchema,
  financeTeamId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null),
  defaultFundId: z.union([z.uuid(), z.literal("")]).transform((value) => value || null),
  requireTwoFactor: z.enum(["on", "off"]).default("off"),
});

const certificateSchema = z.object({
  legalName: optionalText(120),
  pboNumber: optionalText(30),
  address: optionalText(300),
  signatoryName: optionalText(120),
});

export async function saveFinanceControlsAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "finance.manage", write: true },
    async ({ tx, actor }) => {
      const values = formToObject(formData);
      const input = parseInput(controlsSchema, {
        ...values,
        requireTwoFactor: values.requireTwoFactor ?? "off",
      });
      if (input.financeTeamId) {
        ensure(
          (await teams.listTeamsOverview(tx)).some((team) => team.id === input.financeTeamId),
          "notFound",
        );
      }
      if (input.defaultFundId)
        ensure(
          (await finance.getFund(tx, input.defaultFundId))?.isActive === true,
          "finance.fundInactive",
        );
      const before = await finance.getSettings(tx);
      const patch = {
        secondApprovalAboveCents: input.secondApprovalAbove > 0 ? input.secondApprovalAbove : null,
        financeTeamId: input.financeTeamId,
        defaultFundId: input.defaultFundId,
        requireTwoFactor: input.requireTwoFactor === "on",
      };
      await finance.saveSettings(tx, patch);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "finance.settingsChanged",
        entityType: "financeSettings",
        entityId: null,
        before,
        after: patch,
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function saveCertificateDetailsAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "finance.manage", write: true },
    async ({ tx, actor }) => {
      const input = parseInput(certificateSchema, formToObject(formData));
      const before = await finance.getSettings(tx);
      await finance.saveSettings(tx, input);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "finance.certificateDetailsChanged",
        entityType: "financeSettings",
        entityId: null,
        before: {
          legalName: before.legalName,
          pboNumber: before.pboNumber,
          address: before.address,
          signatoryName: before.signatoryName,
        },
        after: input,
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function saveFundAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "finance.manage", write: true },
    async ({ tx, actor }) => {
      const form = formToNested(formData);
      const id = form.id ? parseInput(idSchema, form.id) : null;
      const input = parseInput(fundInputSchema, {
        name: form.name,
        code: form.code,
        taxDeductible: form.taxDeductible === "on",
        isActive: form.isActive === "on" || (id === null && form.isActive === undefined),
      });
      if (await finance.fundCodeTaken(tx, input.code, id)) {
        throw new ActionFailure("validation", { code: ["finance.fundCodeTaken"] });
      }
      if (id) {
        const settings = await finance.getSettings(tx);
        ensure(input.isActive || settings.defaultFundId !== id, "finance.defaultFundInactive");
      }
      const saved = id
        ? await finance.updateFund(tx, id, input)
        : await finance.insertFund(tx, input);
      ensure(saved !== null, "notFound");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: id ? "fund.updated" : "fund.created",
        entityType: "fund",
        entityId: saved?.id ?? null,
        after: input,
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}

export async function saveCategoryAction(
  _previous: ActionState<null>,
  formData: FormData,
): Promise<ActionState<null>> {
  const result = await runChurchAction(
    { permission: "finance.manage", write: true },
    async ({ tx, actor }) => {
      const form = formToNested(formData);
      const id = form.id ? parseInput(idSchema, form.id) : null;
      const input = parseInput(expenseCategoryInputSchema, {
        name: form.name,
        isActive: form.isActive === "on" || (id === null && form.isActive === undefined),
      });
      const saved = id
        ? await finance.updateCategory(tx, id, input)
        : await finance.insertCategory(tx, input);
      ensure(saved !== null, "notFound");
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: id ? "expenseCategory.updated" : "expenseCategory.created",
        entityType: "expenseCategory",
        entityId: saved?.id ?? null,
        after: input,
      });
      return null;
    },
  );
  if (result.status === "success") refresh();
  return result;
}
