import { displayName, initials } from "@ecclesia/domain/people";
import { Crown } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { localized } from "@/i18n/config";
import { DeletePersonButton } from "@/modules/people/delete-person";
import { PersonForm } from "@/modules/people/person-form";
import { loadPerson } from "@/modules/people/queries";
import { ServingTags } from "@/modules/people/serving-tags";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Person" };

const isoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ person, assignments, serving, canWrite }, context, t, format, locale] =
    await Promise.all([
      loadPerson(id),
      getChurchContext(),
      getTranslations("people"),
      getFormatter(),
      getLocale(),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/people" label={t("back")} />
      <header className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="inline-flex size-16 shrink-0 items-center justify-center rounded-card bg-gradient-to-br from-brand to-[#0a3d2b] font-display text-2xl font-bold text-white"
        >
          {initials(person)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[2rem] leading-tight font-bold">{displayName(person)}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ServingTags serving={serving} />
          </div>
        </div>
        {canWrite && context.accessLevel === "full" ? (
          <DeletePersonButton id={person.id} name={displayName(person)} />
        ) : null}
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <PersonForm
          disabled={!canWrite || context.accessLevel !== "full"}
          initial={{
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            gender: person.gender,
            email: person.email,
            phone: person.phone,
            dateOfBirth: isoDate(person.dateOfBirth),
            joinedYear: person.joinedYear,
          }}
        />
        <aside className="card h-fit p-5">
          <h2 className="text-lg font-bold">{t("teamsTitle")}</h2>
          {assignments.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">{t("noTeams")}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {assignments.map((entry) => (
                <li key={entry.assignmentId}>
                  <Link
                    href={`/teams/${entry.teamId}`}
                    className="flex items-center gap-1.5 font-semibold hover:text-accent"
                  >
                    {entry.isLeadership ? (
                      <Crown aria-hidden className="size-3.5 text-gold-ink" />
                    ) : null}
                    {localized(entry.teamName, locale)}
                  </Link>
                  <p className="text-sm text-ink-soft">
                    {t("roleSince", {
                      role: localized(entry.positionName, locale),
                      date: format.dateTime(entry.startsOn, {
                        dateStyle: "medium",
                        timeZone: "UTC",
                      }),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {canWrite ? <p className="mt-4 text-xs text-ink-faint">{t("teamsHint")}</p> : null}
        </aside>
      </div>
    </div>
  );
}
