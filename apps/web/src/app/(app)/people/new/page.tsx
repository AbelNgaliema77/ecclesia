import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PersonForm } from "@/modules/people/person-form";
import { loadNewPersonOptions } from "@/modules/people/queries";

export const metadata: Metadata = { title: "Add a person" };

export default async function NewPersonPage() {
  const [t, locale] = await Promise.all([getTranslations("people"), getLocale()]);
  const options = await loadNewPersonOptions(locale);
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/people" label={t("back")} />
      <PageHeader title={t("newTitle")} />
      <PersonForm
        disabled={options.disabled}
        teams={options.teams}
        teamRequired={options.teamRequired}
      />
    </div>
  );
}
