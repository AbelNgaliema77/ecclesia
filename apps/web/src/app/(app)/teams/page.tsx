import { teams } from "@ecclesia/db/repositories";
import { Crown, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { localized } from "@/i18n/config";
import { readChurch } from "@/server/queries";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage() {
  const [overview, t, locale] = await Promise.all([
    readChurch("teams.read", ({ tx }) => teams.listTeamsOverview(tx)),
    getTranslations("teams"),
    getLocale(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      {overview.length === 0 ? (
        <EmptyState icon={Workflow} message={t("empty")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {overview.map((team) => {
            const people = new Set(team.positions.flatMap((p) => p.holders.map((h) => h.personId)));
            const color = team.color ?? "#1f9d68";
            return (
              <section key={team.id} className="card flex flex-col overflow-hidden">
                <header className="flex items-center gap-4 p-5">
                  <span
                    aria-hidden
                    className="inline-flex size-12 shrink-0 items-center justify-center rounded-control"
                    style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
                  >
                    <Workflow className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">{localized(team.name, locale)}</h2>
                    <p className="mt-0.5 text-sm text-ink-faint">
                      {t("positions", { count: team.positions.length })},{" "}
                      {t("people", { count: people.size })}
                    </p>
                  </div>
                </header>
                <ul className="flex flex-col gap-2 px-3 pb-3">
                  {team.positions.map((position) => (
                    <li key={position.id} className="rounded-control bg-muted px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {localized(position.name, locale)}
                        </span>
                        {position.isLeadership ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-gold-ink">
                            <Crown aria-hidden className="size-3" />
                            {t("lead_badge")}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        {position.holders.length === 0 ? (
                          <span className="font-semibold text-gold-ink">{t("vacant")}</span>
                        ) : (
                          position.holders.map((holder, index) => (
                            <span key={holder.personId}>
                              <Link
                                href={`/people/${holder.personId}`}
                                className="hover:text-accent hover:underline"
                              >
                                {holder.firstName} {holder.lastName}
                              </Link>
                              {index < position.holders.length - 1 ? ", " : ""}
                            </span>
                          ))
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
