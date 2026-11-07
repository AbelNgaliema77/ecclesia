import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { FormAlert } from "@/components/ui/form-alert";
import { PageHeader } from "@/components/ui/page-header";
import { ExpenseForm } from "@/modules/finance/expense-form";
import { loadExpenseForm } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "New payment request" };

export default async function NewExpensePage() {
  const [data, t] = await Promise.all([loadExpenseForm(), getTranslations("finance.expenses")]);
  return (
    <div className="flex flex-col gap-6">
      <BackLink href="/finance/expenses" label={t("back")} />
      <PageHeader title={t("newTitle")} lead={t("newLead")} />
      {data.teamRequired && data.teams.length === 0 ? (
        <FormAlert tone="error" message={t("noTeams")} />
      ) : (
        <ExpenseForm {...data} />
      )}
    </div>
  );
}
