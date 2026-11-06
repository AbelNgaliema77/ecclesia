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
