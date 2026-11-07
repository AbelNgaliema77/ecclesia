import "server-only";
import { people, teams } from "@ecclesia/db/repositories";
import { broadestScope, can } from "@ecclesia/domain/access";
import { PEOPLE_FILTERS, type PeopleFilter } from "@ecclesia/domain/people";
import { notFound } from "next/navigation";
import { localized } from "@/i18n/config";
import { readChurch } from "@/server/queries";
import { visibilityFor } from "./visibility";

export const PAGE_SIZE = 25;

export type PeopleSearch = {
  readonly q: string;
  readonly filter: PeopleFilter | null;
  readonly page: number;
};

export const parsePeopleSearch = (
  params: Record<string, string | string[] | undefined>,
): PeopleSearch => {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const filter = first(params.filter);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    q: (first(params.q) ?? "").slice(0, 100),
    filter: PEOPLE_FILTERS.includes(filter as PeopleFilter) ? (filter as PeopleFilter) : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
};

export const loadPeople = async (search: PeopleSearch) =>
  readChurch("people.read", async ({ tx, actor }) => {
    const visibility = visibilityFor(actor, "people.read");
    if (!visibility) notFound();
    const result = await people.listPeople(tx, visibility, {
      search: search.q,
      ...(search.filter ? { filter: search.filter } : {}),
      limit: PAGE_SIZE,
      offset: (search.page - 1) * PAGE_SIZE,
    });
    return {
      ...result,
      pages: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
      canWrite: can(actor, "people.write") && visibility.scope !== "self",
      canImport: broadestScope(actor.grants, "people.write") === "church",
    };
  });

export const loadPerson = async (id: string) =>
  readChurch("people.read", async ({ tx, actor }) => {
    const person = await people.getPerson(tx, id);
    if (!person) notFound();
    const teamIds = await people.personTeamIds(tx, id);
    const resource = { personId: person.id, teamIds };
    if (!can(actor, "people.read", resource)) notFound();
    const [assignments, serving] = await Promise.all([
      teams.activeAssignmentsFor(tx, id),
      people.servingFor(tx, [id]),
    ]);
    return {
      person,
      assignments,
      serving: serving.get(id) ?? [],
      canWrite: can(actor, "people.write", resource),
    };
  });

export const loadNewPersonOptions = async (locale: string) =>
  readChurch("people.write", async ({ tx, actor, accessLevel }) => {
    const churchWide = broadestScope(actor.grants, "people.write") === "church";
    const targets = await teams.listImportTargets(tx);
    return {
      disabled: accessLevel !== "full",
      teamRequired: !churchWide,
      teams: targets
        .filter(
          (target) => target.positionId && (churchWide || actor.ledTeamIds.includes(target.teamId)),
        )
        .map((target) => ({ id: target.teamId, name: localized(target.name, locale) })),
    };
  });
