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
      "",
      "Female",
      "thandi@example.org",
      "+27821234567",
      "1990-04-12",
      "Member",
      "2023-02-05",
      "",
      "Worship",
    ],
    [
      "Jean",
      "Kabila",
      "JK",
      "Male",
      "",
      "+243812345678",
      "",
      "Visitor",
      "2026-01-11",
      "Came with family",
      "",
    ],
  ],
  fr: [
    [
      "Thandi",
      "Mokoena",
      "",
      "Femme",
      "thandi@example.org",
      "+27821234567",
      "12/04/1990",
      "Membre",
      "05/02/2023",
      "",
      "Louange",
    ],
    [
      "Jean",
      "Kabila",
      "JK",
      "Homme",
      "",
      "+243812345678",
      "",
      "Visiteur",
      "11/01/2026",
      "Venu en famille",
      "",
    ],
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
