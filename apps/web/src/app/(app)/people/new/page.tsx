import { can } from "@ecclesia/domain/access";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { PersonForm } from "@/modules/people/person-form";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Add a person" };

export default async function NewPersonPage() {
  const context = await getChurchContext();
  if (!can(context.actor, "people.write")) notFound();
  const t = await getTranslations("people");
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/people" label={t("back")} />
      <PageHeader title={t("newTitle")} />
      <PersonForm disabled={context.accessLevel !== "full"} />
    </div>
  );
}
