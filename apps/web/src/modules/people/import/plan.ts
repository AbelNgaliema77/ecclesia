import "server-only";
import type { Tx } from "@ecclesia/db";
import { people, teams } from "@ecclesia/db/repositories";
import {
  decideImport,
  type ImportColumn,
  type ImportIssue,
  MAX_IMPORT_ROWS,
  matchByName,
  readImportTable,
  type ValidPerson,
} from "@ecclesia/domain/people";
import { z } from "zod";

export const importTableSchema = z
  .array(z.array(z.string().max(2000)).max(40))
  .min(1)
  .max(MAX_IMPORT_ROWS + 1);

export type ImportTableInput = z.infer<typeof importTableSchema>;

export type PreviewRow = {
  readonly row: number;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly team: string;
  readonly outcome: "ready" | "duplicate" | "invalid";
  readonly duplicateWithin?: "file" | "church";
  readonly issues: readonly ImportIssue[];
};

export type ImportPreview = {
  readonly missing: readonly ImportColumn[];
  readonly rows: readonly PreviewRow[];
  readonly ready: number;
  readonly duplicates: number;
  readonly invalid: number;
};

export type ImportPlan = ImportPreview & {
  readonly inserts: readonly { readonly person: ValidPerson; readonly positionId: string | null }[];
};

export const planImport = async (tx: Tx, table: ImportTableInput): Promise<ImportPlan> => {
  const { mapping, candidates } = readImportTable(table);
  if (mapping.missing.length > 0) {
    return { missing: mapping.missing, rows: [], ready: 0, duplicates: 0, invalid: 0, inserts: [] };
  }
  const [existing, targets] = await Promise.all([
    people.identityRecords(tx),
    teams.listImportTargets(tx),
  ]);
  const remaining = new Map(targets.map((t) => [t.teamId, t.openSpots]));
  const rows: PreviewRow[] = [];
  const inserts: { person: ValidPerson; positionId: string | null }[] = [];

  for (const decision of decideImport(candidates, existing)) {
    const { candidate } = decision;
    const base = {
      row: candidate.row,
      name: `${candidate.values.firstName} ${candidate.values.lastName}`.trim(),
      email: candidate.values.email,
      phone: candidate.values.phone,
      team: candidate.values.team,
    };
    if (decision.kind === "invalid") {
      rows.push({ ...base, outcome: "invalid", issues: candidate.issues });
      continue;
    }
    if (decision.kind === "duplicate") {
      rows.push({ ...base, outcome: "duplicate", duplicateWithin: decision.within, issues: [] });
      continue;
    }
    let positionId: string | null = null;
    if (candidate.team) {
      const target = matchByName(candidate.team, targets);
      const spots = target ? remaining.get(target.teamId) : undefined;
      const issue: ImportIssue | null = !target
        ? { column: "team", code: "import.unknownTeam" }
        : !target.positionId || spots === 0
          ? { column: "team", code: "import.teamFull" }
          : null;
      if (issue || !target) {
        rows.push({ ...base, outcome: "invalid", issues: issue ? [issue] : [] });
        continue;
      }
      positionId = target.positionId;
      if (typeof spots === "number") remaining.set(target.teamId, spots - 1);
    }
    rows.push({ ...base, outcome: "ready", issues: [] });
    inserts.push({ person: decision.person, positionId });
  }

  const count = (outcome: PreviewRow["outcome"]) =>
    rows.filter((r) => r.outcome === outcome).length;
  return {
    missing: [],
    rows,
    ready: count("ready"),
    duplicates: count("duplicate"),
    invalid: count("invalid"),
    inserts,
  };
};
