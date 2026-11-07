import { displayName, initials, PEOPLE_FILTERS } from "@ecclesia/domain/people";
import { FileUp, Plus, Search, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { loadPeople, parsePeopleSearch } from "@/modules/people/queries";
import { ServingTags } from "@/modules/people/serving-tags";

export const metadata: Metadata = { title: "People" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const AVATAR_TONES = [
  "bg-brand-soft text-brand-soft-ink",
  "bg-gold-soft text-gold-ink",
  "bg-muted text-ink-soft",
] as const;

export default async function PeoplePage({ searchParams }: PageProps) {
  const search = parsePeopleSearch(await searchParams);
  const [data, t] = await Promise.all([loadPeople(search), getTranslations("people")]);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (search.q) params.set("q", search.q);
    if (search.filter) params.set("filter", search.filter);
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return (query ? `/people?${query}` : "/people") as "/people";
  };

  const filtered = Boolean(search.q || search.filter);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        actions={
          data.canWrite ? (
            <>
              {data.canImport ? (
                <Link href="/people/import" className={buttonClasses("secondary")}>
                  <FileUp aria-hidden className="size-4" />
                  {t("import.open")}
                </Link>
              ) : null}
              <Link href="/people/new" className={buttonClasses("primary")}>
                <Plus aria-hidden className="size-4" />
                {t("add")}
              </Link>
            </>
          ) : null
        }
      />

      <form
        aria-label={t("searchLabel")}
        className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <label htmlFor="people-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
          />
          <Input
            id="people-search"
            name="q"
            defaultValue={search.q}
            placeholder={t("searchPlaceholder")}
            className="pl-10"
            type="search"
          />
        </div>
        <div className="sm:w-52">
          <label htmlFor="people-filter" className="sr-only">
            {t("filterLabel")}
          </label>
          <Select id="people-filter" name="filter" defaultValue={search.filter ?? ""}>
            <option value="">{t("filter.everyone")}</option>
            {PEOPLE_FILTERS.map((f) => (
              <option key={f} value={f}>
                {t(`filter.${f}`)}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className={buttonClasses("soft")}>
          {t("searchLabel")}
        </button>
      </form>

      <p className="text-sm font-medium text-ink-faint" aria-live="polite">
        {t("count", { count: data.total })}
      </p>

      {data.rows.length === 0 ? (
        <EmptyState icon={UsersRound} message={filtered ? t("empty") : t("emptyDirectory")} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-[0.9375rem]">
            <thead className="border-b border-line text-xs font-semibold text-ink-faint">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  {t("columns.name")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 md:table-cell">
                  {t("columns.teams")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 xl:table-cell">
                  {t("columns.phone")}
                </th>
                <th scope="col" className="hidden px-4 py-3.5 2xl:table-cell">
                  {t("columns.email")}
                </th>
                <th scope="col" className="px-5 py-3.5 text-right sm:text-left">
                  {t("columns.joined")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.rows.map((person, index) => (
                <tr key={person.id} className="group transition-colors hover:bg-muted">
                  <td className="px-5 py-3">
                    <Link
                      href={`/people/${person.id}`}
                      className="flex items-center gap-3 font-semibold"
                    >
                      <span
                        aria-hidden
                        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_TONES[index % AVATAR_TONES.length]}`}
                      >
                        {initials(person)}
                      </span>
                      <span className="group-hover:text-accent">{displayName(person)}</span>
                    </Link>
                    {person.serving.length > 0 ? (
                      <div className="mt-2 pl-12 md:hidden">
                        <ServingTags serving={person.serving} />
                      </div>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {person.serving.length > 0 ? (
                      <ServingTags serving={person.serving} />
                    ) : (
                      <span className="text-ink-faint">–</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-ink-soft xl:table-cell">
                    {person.phone ?? "–"}
                  </td>
                  <td className="hidden max-w-64 truncate px-4 py-3 text-ink-soft 2xl:table-cell">
                    {person.email ?? "–"}
                  </td>
                  <td className="px-5 py-3 text-right text-ink-soft tabular-nums sm:text-left">
                    {person.joinedYear ?? "–"}
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
          <span className="font-medium text-ink-faint">
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
