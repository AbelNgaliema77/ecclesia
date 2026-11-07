import { ChevronRight, Search, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Money } from "@/modules/finance/money";
import { loadDonors } from "@/modules/finance/queries";

export const metadata: Metadata = { title: "Donors" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function DonorsPage({ searchParams }: PageProps) {
  const [data, t, format] = await Promise.all([
    loadDonors(await searchParams),
    getTranslations("finance.donors"),
    getFormatter(),
  ]);
  const href = (page: number) => {
    const params = new URLSearchParams();
    if (data.q) params.set("q", data.q);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/finance/donors?${query}` : "/finance/donors";
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          <Link href="/finance/certificates" className={buttonClasses("secondary")}>
            {t("certificates")}
          </Link>
        }
      />
      <form className="flex gap-2">
        <label htmlFor="donor-search" className="sr-only">
          {t("search")}
        </label>
        <Input
          id="donor-search"
          name="q"
          type="search"
          defaultValue={data.q ?? ""}
          placeholder={t("searchPlaceholder")}
        />
        <button type="submit" className={buttonClasses("secondary")} aria-label={t("search")}>
          <Search aria-hidden className="size-4" />
        </button>
      </form>
      <p className="text-sm text-ink-faint">{t("count", { count: data.total })}</p>
      {data.rows.length === 0 ? (
        <EmptyState icon={UsersRound} message={t("empty")} />
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {data.rows.map((row) => (
            <li key={row.personId}>
              <Link
                href={`/finance/donors/${row.personId}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-muted"
              >
                <span className="min-w-0 flex-1 basis-full sm:basis-0">
                  <span className="block font-semibold">
                    {row.firstName} {row.lastName}
                  </span>
                  <span className="block text-xs text-ink-faint">
                    {[
                      row.givingNumber,
                      row.lastGiftOn
                        ? t("lastGift", {
                            date: format.dateTime(new Date(`${row.lastGiftOn}T12:00:00Z`), {
                              dateStyle: "medium",
                              timeZone: "UTC",
                            }),
                          })
                        : t("noGifts"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs text-ink-faint">{t("thisTaxYear")}</span>
                  <Money cents={row.yearCents} currency={data.currency} className="font-semibold" />
                </span>
                <ChevronRight aria-hidden className="size-4 text-ink-faint" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} href={href} />
    </div>
  );
}
