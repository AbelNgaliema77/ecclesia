import { teams } from "@ecclesia/db/repositories";
import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
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
    <div className="flex flex-col gap-8">
      <PageHeader title={t("title")} lead={t("lead")} />
      {overview.length === 0 ? (
        <p className="rounded-panel border border-dashed border-line-strong p-10 text-ink-soft">
          {t("empty")}
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {overview.map((team) => {
            const people = new Set(team.positions.flatMap((p) => p.holders.map((h) => h.personId)));
            return (
              <section
                key={team.id}
                className="flex flex-col rounded-panel border border-line bg-surface"
              >
                <header className="flex items-start gap-3 border-b border-line p-5">
                  <span
                    aria-hidden
                    className="mt-1.5 size-2.5 shrink-0 rounded-full"
                    style={{ background: team.color ?? "#2b7a6e" }}
                  />
                  <div className="flex-1">
                    <h2 className="font-display text-lg font-medium">
                      {localized(team.name, locale)}
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-faint">
                      {t("positions", { count: team.positions.length })},{" "}
                      {t("people", { count: people.size })}
                    </p>
                  </div>
                </header>
                <ul className="divide-y divide-line">
                  {team.positions.map((position) => (
                    <li
                      key={position.id}
                      className="grid gap-2 px-5 py-3.5 sm:grid-cols-[11rem_minmax(0,1fr)]"
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-sm font-medium">
                          {localized(position.name, locale)}
                        </span>
                        {position.isLeadership ? (
                          <Badge tone="sanctuary">{t("lead_badge")}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm leading-relaxed text-ink-soft">
                        {position.holders.length === 0 ? (
                          <span className="text-candle-700">{t("vacant")}</span>
                        ) : (
                          position.holders.map((holder, index) => (
                            <span key={holder.personId}>
                              <Link
                                href={`/people/${holder.personId}`}
                                className="hover:text-ink hover:underline"
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
