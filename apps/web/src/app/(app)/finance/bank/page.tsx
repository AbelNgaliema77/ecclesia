import { can } from "@ecclesia/domain/access";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { FormAlert } from "@/components/ui/form-alert";
import { PageHeader } from "@/components/ui/page-header";
import { BankImportWizard } from "@/modules/finance/bank-import-wizard";
import { loadBankImports } from "@/modules/finance/queries";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Bank import" };

export default async function BankPage() {
  const [data, context, t, te, format] = await Promise.all([
    loadBankImports(),
    getChurchContext(),
    getTranslations("finance.bank"),
    getTranslations("errors"),
    getFormatter(),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      {data.canWrite ? (
        <BankImportWizard
          funds={data.funds}
          currency={data.currency}
          showNames={can(context.actor, "giving.readIndividual")}
        />
      ) : (
        <FormAlert tone="error" message={te("subscription.readOnly")} />
      )}
      {data.imports.length > 0 ? (
        <section className="card overflow-hidden">
          <h2 className="border-b border-line px-5 py-4 text-lg font-bold">{t("history")}</h2>
          <ul className="divide-y divide-line">
            {data.imports.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 text-sm"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{entry.fileName}</span>
                <span className="text-ink-soft">
                  {t("historyLine", { gifts: entry.giftCount, lines: entry.lineCount })}
                </span>
                <span className="text-ink-faint">
                  {entry.importedByName ?? "–"} ·{" "}
                  {format.dateTime(entry.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
