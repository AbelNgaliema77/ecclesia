import "server-only";
import { people, teams } from "@ecclesia/db/repositories";
import { broadestScope, can } from "@ecclesia/domain/access";
import { notFound } from "next/navigation";
import { readChurch } from "@/server/queries";

export const loadTeams = async () =>
  readChurch("teams.read", async ({ tx, actor, accessLevel }) => ({
    teams: await teams.listTeamsOverview(tx),
    canCreate: accessLevel === "full" && broadestScope(actor.grants, "teams.write") === "church",
  }));

export const loadTeam = async (id: string) =>
  readChurch("teams.read", async ({ tx, actor, accessLevel }) => {
    const team = await teams.getTeamDetail(tx, id);
    if (!team) notFound();
    const canManage = accessLevel === "full" && can(actor, "teams.write", { teamIds: [id] });
    return {
      team,
      canManage,
      canDelete: canManage && broadestScope(actor.grants, "teams.write") === "church",
      people: canManage
        ? (await people.listPeopleOptions(tx)).map((p) => ({
            id: p.id,
            label: `${p.lastName}, ${p.firstName}`,
          }))
        : [],
    };
  });

export const loadLedTeams = async () =>
  readChurch("teams.read", async ({ tx, actor }) => {
    if (actor.ledTeamIds.length === 0) return [];
    const overview = await teams.listTeamsOverview(tx);
    return overview
      .filter((team) => actor.ledTeamIds.includes(team.id))
      .map((team) => {
        const people = new Set(team.positions.flatMap((p) => p.holders.map((h) => h.personId)));
        const open = team.positions.reduce(
          (sum, p) =>
            sum + (p.maxHolders === null ? 0 : Math.max(0, p.maxHolders - p.holders.length)),
          0,
        );
        return { id: team.id, name: team.name, color: team.color, members: people.size, open };
      });
  });
