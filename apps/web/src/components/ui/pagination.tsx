import type { Route } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "./button";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  href: (page: number) => string;
};

export async function Pagination({ page, pageSize, total, href }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const t = await getTranslations("common.pagination");
  return (
    <nav aria-label={t("label")} className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={href(page - 1) as Route} className={buttonClasses("ghost", "sm")}>
          {t("previous")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-ink-faint">{t("status", { page, pages })}</span>
      {page < pages ? (
        <Link href={href(page + 1) as Route} className={buttonClasses("ghost", "sm")}>
          {t("next")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
