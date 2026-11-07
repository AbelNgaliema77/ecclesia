"use server";

import { audit, finance, giving, people } from "@ecclesia/db/repositories";
import { can } from "@ecclesia/domain/access";
import {
  ensureOpenPeriod,
  type IsoDate,
  MAX_STATEMENT_ROWS,
  matchStatementLine,
  readStatement,
  type StatementLine,
} from "@ecclesia/domain/finance";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ActionFailure, ensure, parseInput, runChurchAction } from "@/server/action";

const tableSchema = z
  .array(z.array(z.string().max(500)).max(30))
  .min(1)
  .max(MAX_STATEMENT_ROWS + 1);

const fileNameSchema = z.string().trim().min(1).max(200);

export type BankPreviewLine = StatementLine & {
  readonly duplicate: boolean;
  readonly closed: boolean;
  readonly personId: string | null;
  readonly personName: string | null;
  readonly givingNumber: string | null;
  readonly fundId: string | null;
};

export type BankPreview = {
  readonly lines: readonly BankPreviewLine[];
  readonly skipped: number;
};

const parseStatement = (table: unknown) => {
  const read = readStatement(parseInput(tableSchema, table));
  if (!read.ok) throw new ActionFailure(read.code);
  return read;
};

export async function previewBankImportAction(table: unknown): Promise<ActionState<BankPreview>> {
  return runChurchAction({ permission: "giving.capture", write: true }, async ({ tx, actor }) => {
    const read = parseStatement(table);
    const showNames = can(actor, "giving.readIndividual");
    const [known, donors, funds, settings, closed] = await Promise.all([
      giving.knownFingerprints(
        tx,
        read.credits.map((c) => c.fingerprint),
      ),
      giving.donorNumbers(tx),
      finance.listFunds(tx, { activeOnly: true }),
      finance.getSettings(tx),
      finance.closedMonths(tx),
    ]);
    const matchDonors = donors.flatMap((d) =>
      d.givingNumber ? [{ personId: d.personId, givingNumber: d.givingNumber }] : [],
    );
    const matched = read.credits.map((line) => ({
      line,
      match: matchStatementLine(
        line.description,
        showNames ? matchDonors : [],
        funds,
        settings.defaultFundId,
      ),
    }));
    const personIds = [
      ...new Set(matched.flatMap((m) => (m.match.personId ? [m.match.personId] : []))),
    ];
    const names = await people.displayNames(tx, personIds);
    return {
      skipped: read.skipped,
      lines: matched.map(({ line, match }) => ({
        ...line,
        duplicate: known.has(line.fingerprint),
        closed: !ensureOpenPeriod(line.postedOn, closed).ok,
        personId: match.personId,
        personName: match.personId ? (names.get(match.personId) ?? null) : null,
        givingNumber: match.personId
          ? (donors.find((d) => d.personId === match.personId)?.givingNumber ?? null)
          : null,
        fundId: match.fundId,
      })),
    };
  });
}

const decisionSchema = z.object({
  fingerprint: z.string().min(1).max(400),
  include: z.boolean(),
  fundId: z.uuid().nullable(),
  personId: z.uuid().nullable(),
});

const commitSchema = z.object({
  fileName: fileNameSchema,
  decisions: z.array(decisionSchema).max(MAX_STATEMENT_ROWS),
});

export async function commitBankImportAction(
  table: unknown,
  payload: unknown,
): Promise<ActionState<{ gifts: number; ignored: number }>> {
  const result = await runChurchAction(
    { permission: "giving.capture", write: true },
    async ({ tx, actor }) => {
      const read = parseStatement(table);
      const input = parseInput(commitSchema, payload);
      const decisions = new Map(input.decisions.map((d) => [d.fingerprint, d]));
      const [known, funds, closed] = await Promise.all([
        giving.knownFingerprints(
          tx,
          read.credits.map((c) => c.fingerprint),
        ),
        finance.listFunds(tx, { activeOnly: true }),
        finance.closedMonths(tx),
      ]);
      const fresh = read.credits.filter(
        (line) => !known.has(line.fingerprint) && decisions.has(line.fingerprint),
      );
      ensure(fresh.length > 0, "finance.bank.nothingNew");

      const personIds = [
        ...new Set(
          fresh.flatMap((line) => {
            const decision = decisions.get(line.fingerprint);
            return decision?.include && decision.personId ? [decision.personId] : [];
          }),
        ),
      ];
      if (personIds.length > 0) {
        ensure(can(actor, "giving.readIndividual"));
        ensure((await people.existingIds(tx, personIds)).size === personIds.length, "notFound");
      }

      const included: { line: StatementLine; fundId: string; personId: string | null }[] = [];
      const ignored: StatementLine[] = [];
      for (const line of fresh) {
        const decision = decisions.get(line.fingerprint);
        if (!decision?.include) {
          ignored.push(line);
          continue;
        }
        const period = ensureOpenPeriod(line.postedOn, closed);
        if (!period.ok) throw new ActionFailure(period.error.code);
        ensure(
          decision.fundId !== null && funds.some((f) => f.id === decision.fundId),
          "finance.fundInactive",
        );
        included.push({ line, fundId: decision.fundId ?? "", personId: decision.personId });
      }

      const importId = await giving.insertBankImport(
        tx,
        { fileName: input.fileName, lineCount: fresh.length, giftCount: included.length },
        actor.userId,
      );
      const created = await giving.insertGifts(
        tx,
        included.map(({ line, fundId, personId }) => ({
          fundId,
          personId,
          method: "eft" as const,
          amountCents: line.amountCents,
          receivedOn: line.postedOn as IsoDate,
          reference: line.description.slice(0, 80) || null,
          bankImportId: importId,
        })),
        actor.userId,
      );
      await giving.insertBankLines(tx, importId, [
        ...included.map(({ line }, index) => ({
          postedOn: line.postedOn,
          description: line.description,
          amountCents: line.amountCents,
          fingerprint: line.fingerprint,
          status: "matched" as const,
          giftId: created[index]?.id ?? null,
        })),
        ...ignored.map((line) => ({
          postedOn: line.postedOn,
          description: line.description,
          amountCents: line.amountCents,
          fingerprint: line.fingerprint,
          status: "ignored" as const,
          giftId: null,
        })),
      ]);
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "bank.imported",
        entityType: "bankImport",
        entityId: importId,
        after: { fileName: input.fileName, gifts: created.length, ignored: ignored.length },
      });
      return { gifts: created.length, ignored: ignored.length };
    },
  );
  if (result.status === "success") revalidatePath("/finance", "layout");
  return result;
}
