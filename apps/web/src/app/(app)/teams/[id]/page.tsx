import { Crown, Users, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/ui/empty-state";
import { localized } from "@/i18n/config";
import { loadTeam } from "@/modules/teams/queries";
import {
  AddPositionButton,
  EndAssignmentButton,
  PositionActions,
  TeamHeaderActions,
} from "@/modules/teams/team-controls";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [data, t, format, locale] = await Promise.all([
    loadTeam(id),
    getTranslations("teams"),
    getFormatter(),
    getLocale(),
  ]);
  const { team } = data;
  const name = localized(team.name, locale);
  const color = team.color ?? "#199e70";

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/teams" label={t("back")} />

      <header className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <span
          aria-hidden
          className="inline-flex size-14 shrink-0 items-center justify-center rounded-card"
          style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
        >
          <Workflow className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[2rem] leading-tight font-bold">{name}</h1>
          {team.description ? <p className="mt-1 text-ink-soft">{team.description}</p> : null}
        </div>
        {data.canManage ? (
          <TeamHeaderActions
            team={{
              id: team.id,
              name: team.name,
              displayName: name,
              description: team.description,
              color: team.color,
            }}
            canDelete={data.canDelete}
          />
        ) : null}
      </header>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{t("positions", { count: team.positions.length })}</h2>
        {data.canManage ? <AddPositionButton teamId={team.id} teamName={name} /> : null}
      </div>

      {team.positions.length === 0 ? (
        <EmptyState icon={Users} message={t("noPositions")} />
      ) : (
        <ul className="flex flex-col gap-3">
          {team.positions.map((position) => {
            const positionName = localized(position.name, locale);
            const full =
              position.maxHolders !== null && position.assignments.length >= position.maxHolders;
            return (
              <li key={position.id} className="card flex flex-col gap-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold">{positionName}</span>
                      {position.isLeadership ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs font-semibold text-gold-ink">
                          <Crown aria-hidden className="size-3" />
                          {t("lead_badge")}
                        </span>
                      ) : null}
                    </p>
                    {position.maxHolders !== null ? (
                      <p className="mt-0.5 text-sm text-ink-faint">
                        {t("capacity", {
                          count: position.assignments.length,
                          max: position.maxHolders,
                        })}
                      </p>
                    ) : null}
                  </div>
                  {data.canManage ? (
                    <PositionActions
                      teamId={team.id}
                      teamName={name}
                      position={position}
                      displayName={positionName}
                      canDelete={position.historyCount === 0}
                      people={data.people}
                      holders={position.assignments.map((a) => ({
                        assignmentId: a.assignmentId,
                        personId: a.personId,
                        name: `${a.firstName} ${a.lastName}`,
                      }))}
                      full={full}
                    />
                  ) : null}
                </div>
                {position.assignments.length === 0 ? (
                  <p className="rounded-control bg-gold-soft px-4 py-2.5 text-sm font-semibold text-gold-ink">
                    {t("vacant")}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {position.assignments.map((assignment) => {
                      const personName = `${assignment.firstName} ${assignment.lastName}`;
                      return (
                        <li
                          key={assignment.assignmentId}
                          className="inline-flex items-center gap-2 rounded-full bg-muted py-1 pr-1.5 pl-1 ring-1 ring-line ring-inset"
                        >
                          <span
                            aria-hidden
                            className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-[0.6875rem] font-bold text-brand-soft-ink"
                          >
                            {assignment.firstName.charAt(0)}
                            {assignment.lastName.charAt(0)}
                          </span>
                          <Link
                            href={`/people/${assignment.personId}`}
                            className="text-sm font-semibold hover:text-accent"
                          >
                            {personName}
                          </Link>
                          <span className="hidden text-xs text-ink-faint sm:inline">
                            {t("since", {
                              date: format.dateTime(assignment.startsOn, {
                                dateStyle: "medium",
                                timeZone: "UTC",
                              }),
                            })}
                          </span>
                          {data.canManage ? (
                            <EndAssignmentButton
                              assignmentId={assignment.assignmentId}
                              personName={personName}
                              positionName={positionName}
                            />
                          ) : (
                            <span className="w-1" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
