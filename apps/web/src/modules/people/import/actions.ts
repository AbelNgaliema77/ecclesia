"use server";

import { audit, people, teams } from "@ecclesia/db/repositories";
import { broadestScope } from "@ecclesia/domain/access";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { ensure, parseInput, runChurchAction } from "@/server/action";
import { type ImportPreview, importTableSchema, planImport } from "./plan";

const withoutInserts = ({
  inserts: _inserts,
  ...preview
}: Awaited<ReturnType<typeof planImport>>) => preview;

export async function previewImportAction(table: unknown): Promise<ActionState<ImportPreview>> {
  return runChurchAction({ permission: "people.write", write: true }, async ({ tx, actor }) => {
    ensure(broadestScope(actor.grants, "people.write") === "church");
    return withoutInserts(await planImport(tx, parseInput(importTableSchema, table)));
  });
}

export async function commitImportAction(
  table: unknown,
): Promise<ActionState<{ imported: number; skipped: number }>> {
  const result = await runChurchAction(
    { permission: "people.write", write: true },
    async ({ tx, actor }) => {
      ensure(broadestScope(actor.grants, "people.write") === "church");
      const plan = await planImport(tx, parseInput(importTableSchema, table));
      ensure(plan.missing.length === 0, "import.missingColumns");
      ensure(plan.inserts.length > 0, "import.nothingToImport");
      const inserted = await people.insertPeople(
        tx,
        plan.inserts.map((entry) => entry.person),
      );
      const startsOn = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
      for (const [index, entry] of plan.inserts.entries()) {
        const personId = inserted[index]?.id;
        if (entry.positionId && personId) {
          await teams.insertAssignment(tx, {
            personId,
            positionId: entry.positionId,
            startsOn,
            endsOn: null,
          });
        }
      }
      await audit.recordAudit(tx, {
        actorUserId: actor.userId,
        action: "people.imported",
        entityType: "person",
        entityId: null,
        after: { imported: inserted.length, skipped: plan.duplicates + plan.invalid },
      });
      return { imported: inserted.length, skipped: plan.duplicates + plan.invalid };
    },
  );
  if (result.status === "success") {
    revalidatePath("/people");
    revalidatePath("/teams", "layout");
    revalidatePath("/");
  }
  return result;
}
