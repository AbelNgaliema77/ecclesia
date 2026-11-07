import { broadestScope } from "@ecclesia/domain/access";
import { IMPORT_COLUMNS } from "@ecclesia/domain/people";
import { getLocale, getTranslations } from "next-intl/server";
import Papa from "papaparse";
import { getChurchContext } from "@/server/context";

const EXAMPLES = {
  en: [
    [
      "Thandi",
      "Mokoena",
      "Female",
      "thandi@example.org",
      "+27821234567",
      "1990-04-12",
      "2015",
      "Worship",
    ],
    ["Jean", "Kabila", "Male", "", "+243812345678", "", "2024", "Ushers"],
  ],
  fr: [
    [
      "Thandi",
      "Mokoena",
      "Femme",
      "thandi@example.org",
      "+27821234567",
      "12/04/1990",
      "2015",
      "Louange",
    ],
    ["Jean", "Kabila", "Homme", "", "+243812345678", "", "2024", "Accueil"],
  ],
} as const;

export async function GET() {
  const context = await getChurchContext();
  if (broadestScope(context.actor.grants, "people.write") !== "church") {
    return new Response(null, { status: 404 });
  }
  const [locale, t] = await Promise.all([getLocale(), getTranslations("people")]);
  const headers = IMPORT_COLUMNS.map((column) =>
    column === "team" ? t("import.team") : t(`fields.${column}`),
  );
  const csv = Papa.unparse([headers, ...EXAMPLES[locale === "fr" ? "fr" : "en"]]);
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${t("import.templateFile")}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
