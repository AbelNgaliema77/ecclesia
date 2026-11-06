import { ChevronRight, Crown, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { localized } from "@/i18n/config";
import { loadTeams } from "@/modules/teams/queries";
import { CreateTeamButton } from "@/modules/teams/team-controls";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  const [data, t, locale] = await Promise.all([loadTeams(), getTranslations("teams"), getLocale()]);
  const usedColors = data.teams.map((team) => team.color).filter((c): c is string => c !== null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={data.canCreate ? <CreateTeamButton usedColors={usedColors} /> : null}
      />
      {data.teams.length === 0 ? (
        <EmptyState icon={Workflow} message={t("empty")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.teams.map((team) => {
            const people = new Set(team.positions.flatMap((p) => p.holders.map((h) => h.personId)));
            const color = team.color ?? "#199e70";
            const name = localized(team.name, locale);
            const leaders = team.positions
              .filter((p) => p.isLeadership)
              .flatMap((p) => p.holders.map((h) => `${h.firstName} ${h.lastName}`));
            const vacancies = team.positions.filter((p) => p.holders.length === 0).length;
            return (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                aria-label={t("open", { name })}
                className="card group flex flex-col gap-4 p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
              >
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-control"
                    style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
                  >
                    <Workflow className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-bold">{name}</h2>
                    <p className="mt-0.5 text-sm text-ink-faint">
                      {t("positions", { count: team.positions.length })},{" "}
                      {t("people", { count: people.size })}
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden
                    className="size-5 text-ink-faint transition-transform group-hover:translate-x-0.5"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {leaders.map((leader) => (
                    <span
                      key={leader}
                      className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold text-gold-ink"
                    >
                      <Crown aria-hidden className="size-3" />
                      {leader}
                    </span>
                  ))}
                  {vacancies > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-ink-soft">
                      {t("vacant")}: {vacancies}
                    </span>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
