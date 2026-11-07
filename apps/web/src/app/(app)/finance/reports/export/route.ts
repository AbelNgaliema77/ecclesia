import { withChurch } from "@ecclesia/db";
import { can } from "@ecclesia/domain/access";
import { centsToDecimal } from "@ecclesia/domain/finance";
import { getLocale, getTranslations } from "next-intl/server";
import Papa from "papaparse";
import { localized } from "@/i18n/config";
import { churchToday } from "@/modules/finance/context";
import { buildStatement, parseStatementRange } from "@/modules/finance/queries";
import { getChurchContext } from "@/server/context";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const context = await getChurchContext();
  if (!can(context.actor, "giving.readTotals")) return new Response(null, { status: 404 });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const range = parseStatementRange(params, churchToday(context));
  const [statement, t, locale] = await Promise.all([
    withChurch(db, context.membership.churchId, (tx) => buildStatement(tx, range)),
    getTranslations("finance.reports"),
    getLocale(),
  ]);
  const currency = context.membership.currency;
  const rows: string[][] = [
    [t("csv.section"), t("csv.line"), `${t("csv.amount")} (${currency})`],
    ...statement.incomeRows.map((row) => [
      t("income"),
      localized(row.name, locale),
      centsToDecimal(row.cents),
    ]),
    [t("income"), t("total.income"), centsToDecimal(statement.totalIncome)],
    ...statement.expenseRows.map((row) => [
      t("expenses"),
      localized(row.name, locale),
      centsToDecimal(row.cents),
    ]),
    [t("expenses"), t("total.expenses"), centsToDecimal(statement.totalExpenses)],
    ["", statement.net < 0 ? t("deficit") : t("surplus"), centsToDecimal(statement.net)],
  ];
  return new Response(`﻿${Papa.unparse(rows)}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="statement-${range.from}-to-${range.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
