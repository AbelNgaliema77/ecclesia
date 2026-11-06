import { displayName, initials } from "@ecclesia/domain/people";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";
import { BackLink } from "@/components/ui/back-link";
import { PersonForm } from "@/modules/people/person-form";
import { loadPerson } from "@/modules/people/queries";
import { StatusBadge } from "@/modules/people/status-badge";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Person" };

const isoDate = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : null);

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ person, history, canWrite }, context, t, format] = await Promise.all([
    loadPerson(id),
    getChurchContext(),
    getTranslations("people"),
    getFormatter(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/people" label={t("back")} />
      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="inline-flex size-16 shrink-0 items-center justify-center rounded-card bg-gradient-to-br from-brand to-[#0a3d2b] font-display text-2xl font-bold text-white"
        >
          {initials(person)}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[2rem] leading-tight font-bold">{displayName(person)}</h1>
          <div className="mt-1.5">
            <StatusBadge status={person.status} />
          </div>
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <PersonForm
          disabled={!canWrite || context.accessLevel !== "full"}
          initial={{
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            preferredName: person.preferredName,
            gender: person.gender,
            email: person.email,
            phone: person.phone,
            dateOfBirth: isoDate(person.dateOfBirth),
            status: person.status,
            firstVisitOn: isoDate(person.firstVisitOn),
            notes: person.notes,
          }}
        />
        <aside className="card h-fit p-5">
          <h2 className="text-lg font-bold">{t("statusHistory")}</h2>
          <ol className="mt-4 flex flex-col gap-4 border-l-2 border-brand-soft pl-4">
            {history.map((entry) => (
              <li key={`${entry.changedAt.toISOString()}-${entry.toStatus}`} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1 -left-[1.4rem] size-3 rounded-full border-2 border-surface bg-brand"
                />
                <p className="text-sm font-semibold">{t(`status.${entry.toStatus}`)}</p>
                <p className="text-xs text-ink-faint">
                  {format.dateTime(entry.changedAt, { dateStyle: "medium" })}
                </p>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
