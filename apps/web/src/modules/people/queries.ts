import "server-only";
import { people } from "@ecclesia/db/repositories";
import { can } from "@ecclesia/domain/access";
import { PERSON_STATUSES, type PersonStatus } from "@ecclesia/domain/people";
import { notFound } from "next/navigation";
import { readChurch } from "@/server/queries";
import { visibilityFor } from "./visibility";

export const PAGE_SIZE = 25;

export type PeopleSearch = {
  readonly q: string;
  readonly status: PersonStatus | null;
  readonly page: number;
};

export const parsePeopleSearch = (
  params: Record<string, string | string[] | undefined>,
): PeopleSearch => {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const status = first(params.status);
  const page = Number.parseInt(first(params.page) ?? "1", 10);
  return {
    q: (first(params.q) ?? "").slice(0, 100),
    status: PERSON_STATUSES.includes(status as PersonStatus) ? (status as PersonStatus) : null,
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
};

export const loadPeople = async (search: PeopleSearch) =>
  readChurch("people.read", async ({ tx, actor }) => {
    const visibility = visibilityFor(actor, "people.read");
    if (!visibility) notFound();
    const result = await people.listPeople(tx, visibility, {
      search: search.q,
      ...(search.status ? { status: search.status } : {}),
      limit: PAGE_SIZE,
      offset: (search.page - 1) * PAGE_SIZE,
    });
    return {
      ...result,
      pages: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
      canWrite: can(actor, "people.write") && visibility.scope !== "self",
    };
  });

export const loadPerson = async (id: string) =>
  readChurch("people.read", async ({ tx, actor }) => {
    const person = await people.getPerson(tx, id);
    if (!person) notFound();
    const teamIds = await people.personTeamIds(tx, id);
    const resource = { personId: person.id, teamIds };
    if (!can(actor, "people.read", resource)) notFound();
    const history = await people.statusHistory(tx, id);
    return { person, history, canWrite: can(actor, "people.write", resource) };
  });
