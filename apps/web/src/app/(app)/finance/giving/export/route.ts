import { withChurch } from "@ecclesia/db";
import { giving } from "@ecclesia/db/repositories";
import { can } from "@ecclesia/domain/access";
import { centsToDecimal } from "@ecclesia/domain/finance";
import { getLocale, getTranslations } from "next-intl/server";
import Papa from "papaparse";
import { localized } from "@/i18n/config";
import { churchToday } from "@/modules/finance/context";
import { parseGivingSearch } from "@/modules/finance/queries";
import { getChurchContext } from "@/server/context";
import { db } from "@/server/db";

const MAX_EXPORT_ROWS = 50_000;

export async function GET(request: Request) {
  const context = await getChurchContext();
  if (!can(context.actor, "giving.readIndividual")) return new Response(null, { status: 404 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const search = parseGivingSearch(params, churchToday(context));
  const [result, t, tm, locale] = await Promise.all([
    withChurch(db, context.membership.churchId, (tx) =>
      giving.listGifts(tx, {
        from: search.from,
        to: search.to,
        fundId: search.fundId,
        method: search.method,
        search: search.q,
        includeVoided: search.voided,
        limit: MAX_EXPORT_ROWS,
        offset: 0,
      }),
    ),
    getTranslations("finance.giving"),
    getTranslations("finance.methods"),
    getLocale(),
  ]);
  const rows = [
    [
      t("receivedOn"),
      t("giver"),
      t("fund"),
      t("method"),
      t("reference"),
      `${t("amount")} (${context.membership.currency})`,
      t("voidedBadge"),
    ],
    ...result.rows.map((row) => [
      row.receivedOn,
      row.personLastName ? `${row.personFirstName} ${row.personLastName}` : "",
      localized(row.fundName, locale),
      tm(row.method),
      row.reference ?? "",
      centsToDecimal(row.amountCents),
      row.voidReason ?? "",
    ]),
  ];
  return new Response(`﻿${Papa.unparse(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="giving-${search.from}-to-${search.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
