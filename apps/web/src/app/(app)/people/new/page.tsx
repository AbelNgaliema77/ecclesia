import { can } from "@ecclesia/domain/access";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { PersonForm } from "@/modules/people/person-form";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Add a person" };

export default async function NewPersonPage() {
  const context = await getChurchContext();
  if (!can(context.actor, "people.write")) notFound();
  const t = await getTranslations("people");
  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/people"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <PageHeader title={t("newTitle")} />
      <PersonForm disabled={context.accessLevel !== "full"} />
    </div>
  );
}
