import { displayName, PERSON_STATUSES } from "@ecclesia/domain/people";
import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { loadPeople, parsePeopleSearch } from "@/modules/people/queries";
import { StatusBadge } from "@/modules/people/status-badge";

export const metadata: Metadata = { title: "People" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PeoplePage({ searchParams }: PageProps) {
  const search = parsePeopleSearch(await searchParams);
  const [data, t, format] = await Promise.all([
    loadPeople(search),
    getTranslations("people"),
    getFormatter(),
  ]);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (search.q) params.set("q", search.q);
    if (search.status) params.set("status", search.status);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return (query ? `/people?${query}` : "/people") as "/people";
  };

  const filtered = Boolean(search.q || search.status);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          data.canWrite ? (
            <Link href="/people/new" className={buttonClasses("primary")}>
              <Plus aria-hidden className="size-4" />
              {t("add")}
            </Link>
          ) : null
        }
      />

      <form
        aria-label={t("searchLabel")}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <label htmlFor="people-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
          />
          <Input
            id="people-search"
            name="q"
            defaultValue={search.q}
            placeholder={t("searchPlaceholder")}
            className="pl-9"
            type="search"
          />
        </div>
        <div className="sm:w-52">
          <label htmlFor="people-status" className="sr-only">
            {t("statusFilter")}
          </label>
          <Select id="people-status" name="status" defaultValue={search.status ?? ""}>
            <option value="">{t("allStatuses")}</option>
            {PERSON_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className={buttonClasses("secondary")}>
          {t("searchLabel")}
        </button>
      </form>

      <p className="text-sm text-ink-faint" aria-live="polite">
        {t("count", { count: data.total })}
      </p>

      {data.rows.length === 0 ? (
        <div className="rounded-panel border border-dashed border-line-strong p-10 text-ink-soft">
          {filtered ? t("empty") : t("emptyDirectory")}
        </div>
      ) : (
        <div className="overflow-hidden rounded-panel border border-line bg-surface">
          <table className="w-full text-left text-[0.9375rem]">
            <thead className="border-b border-line bg-paper/60 text-sm text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("columns.name")}
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  {t("columns.status")}
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                  {t("columns.phone")}
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium lg:table-cell">
                  {t("columns.email")}
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
                  {t("columns.firstVisit")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((person) => (
                <tr key={person.id} className="group hover:bg-sanctuary-50/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/people/${person.id}`}
                      className="font-medium text-ink group-hover:text-sanctuary-800"
                    >
                      {displayName(person)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={person.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft md:table-cell">
                    {person.phone ?? "–"}
                  </td>
                  <td className="hidden max-w-64 truncate px-4 py-3 text-ink-soft lg:table-cell">
                    {person.email ?? "–"}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft sm:table-cell">
                    {person.firstVisitOn
                      ? format.dateTime(person.firstVisitOn, {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })
                      : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.pages > 1 ? (
        <nav
          className="flex items-center justify-between text-sm"
          aria-label={t("page", { page: search.page, pages: data.pages })}
        >
          {search.page > 1 ? (
            <Link href={pageHref(search.page - 1)} className={buttonClasses("secondary", "sm")}>
              {t("previous")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-faint">
            {t("page", { page: search.page, pages: data.pages })}
          </span>
          {search.page < data.pages ? (
            <Link href={pageHref(search.page + 1)} className={buttonClasses("secondary", "sm")}>
              {t("next")}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
