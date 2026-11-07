"use server";

import { audit, finance, ledger } from "@ecclesia/db/repositories";
import { certificateReadiness, taxYearRange } from "@ecclesia/domain/finance";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { type ActionContext, ensure, parseInput, runChurchAction } from "@/server/action";
import { churchToday } from "./context";

const inputSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  personId: z.union([z.uuid(), z.literal("")]).optional(),
});

const checkYear = async (ctx: ActionContext, year: number) => {
  ensure(churchToday(ctx) > taxYearRange(year).to, "finance.certificates.yearOpen");
  const readiness = certificateReadiness(await finance.getSettings(ctx.tx));
  ensure(readiness.ready, "finance.certificates.notReady");
};

export async function issueCertificatesAction(
  _previous: ActionState<{ issued: number }>,
  formData: FormData,
): Promise<ActionState<{ issued: number }>> {
  const result = await runChurchAction(
    { permission: "giving.readIndividual", write: true },
    async (ctx) => {
      const { tx, actor } = ctx;
      const input = parseInput(inputSchema, {
        year: formData.get("year"),
        personId: formData.get("personId") ?? "",
      });
      await checkYear(ctx, input.year);
      const range = taxYearRange(input.year);
      const totals = await ledger.deductibleTotals(tx, range.from, range.to);
      const targets = input.personId
        ? totals.filter((row) => row.personId === input.personId)
        : totals;
      ensure(targets.length > 0, "finance.certificates.nothingToIssue");
      for (const row of targets) {
        await ledger.issueCertificate(
          tx,
          { personId: row.personId, taxYear: input.year, amountCents: row.totalCents },
          actor.userId,
        );
      }
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "certificates.issued",
        entityType: "taxCertificate",
        entityId: input.personId || null,
        after: { year: input.year, count: targets.length },
      });
      return { issued: targets.length };
    },
  );
  if (result.status === "success") revalidatePath("/finance", "layout");
  return result;
}
