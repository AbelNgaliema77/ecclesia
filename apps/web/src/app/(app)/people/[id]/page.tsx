import { displayName } from "@ecclesia/domain/people";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { z } from "zod";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="flex flex-col gap-8">
      <Link
        href="/people"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <PageHeader title={displayName(person)} actions={<StatusBadge status={person.status} />} />
      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_16rem]">
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
        <aside>
          <h2 className="font-display text-lg font-medium">{t("statusHistory")}</h2>
          <ol className="mt-4 flex flex-col gap-4 border-l border-line pl-4">
            {history.map((entry) => (
              <li key={`${entry.changedAt.toISOString()}-${entry.toStatus}`} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[1.3rem] size-2 rounded-full bg-sanctuary-500"
                />
                <p className="text-sm font-medium">{t(`status.${entry.toStatus}`)}</p>
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
