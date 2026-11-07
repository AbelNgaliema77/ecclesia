import type { Metadata, Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/cn";
import { BudgetEditor } from "@/modules/finance/budget-editor";
import { loadBudgets } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Budgets" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BudgetsPage({ searchParams }: PageProps) {
  const [data, t] = await Promise.all([
    loadBudgets(await searchParams),
    getTranslations("finance.budgets"),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title", { year: data.year })} lead={t("lead")} />
      <nav aria-label={t("yearsLabel")}>
        <ul className="inline-flex gap-1">
          {data.years.map((year) => (
            <li key={year}>
              <Link
                href={`/finance/budgets?year=${year}` as Route}
                aria-current={year === data.year ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-inset transition-colors",
                  year === data.year
                    ? "bg-ink text-canvas ring-transparent"
                    : "text-ink-soft ring-line hover:bg-muted",
                )}
              >
                {year}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <BudgetEditor
        key={data.year}
        year={data.year}
        categories={data.categories}
        rows={data.rows}
        currency={data.currency}
        canEdit={data.canEdit}
      />
    </div>
  );
}
