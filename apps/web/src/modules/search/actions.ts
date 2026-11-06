"use server";

import { people } from "@ecclesia/db/repositories";
import { displayName, type PersonStatus } from "@ecclesia/domain/people";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { ensure, parseInput, runChurchAction } from "@/server/action";
import { visibilityFor } from "../people/visibility";

export type PersonHit = { id: string; name: string; status: PersonStatus };

const querySchema = z.string().trim().min(2).max(60);

export async function searchPeopleAction(query: string): Promise<ActionState<PersonHit[]>> {
  return runChurchAction({ permission: "people.read", write: false }, async ({ tx, actor }) => {
    const term = parseInput(querySchema, query);
    const visibility = visibilityFor(actor, "people.read");
    ensure(visibility !== null);
    if (!visibility) return [];
    const result = await people.listPeople(tx, visibility, { search: term, limit: 8, offset: 0 });
    return result.rows.map((row) => ({ id: row.id, name: displayName(row), status: row.status }));
  });
}
