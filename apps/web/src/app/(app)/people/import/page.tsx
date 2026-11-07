import { broadestScope } from "@ecclesia/domain/access";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { FormAlert } from "@/components/ui/form-alert";
import { PageHeader } from "@/components/ui/page-header";
import { ImportWizard } from "@/modules/people/import/import-wizard";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Import people" };

export default async function ImportPeoplePage() {
  const context = await getChurchContext();
  if (broadestScope(context.actor.grants, "people.write") !== "church") notFound();
  const [t, te] = await Promise.all([getTranslations("people"), getTranslations("errors")]);
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/people" label={t("back")} />
      <PageHeader title={t("import.title")} lead={t("import.lead")} />
      {context.accessLevel === "full" ? (
        <ImportWizard templateHref="/people/import/template" />
      ) : (
        <FormAlert tone="error" message={te("subscription.readOnly")} />
      )}
    </div>
  );
}
