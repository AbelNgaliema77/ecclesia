import type { people } from "@ecclesia/db/repositories";
import { Crown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { localized } from "@/i18n/config";

export function ServingTags({ serving }: { serving: readonly people.Serving[] }) {
  const t = useTranslations("people.serving");
  const locale = useLocale();
  if (serving.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={t("label")}>
      {serving.map((entry) => (
        <li key={entry.teamId}>
          <Badge tone={entry.isLeader ? "brandStrong" : "brand"}>
            {entry.isLeader ? <Crown aria-hidden className="size-3" /> : null}
            {localized(entry.teamName, locale)}
            <span className="sr-only">
              {entry.isLeader ? ` – ${t("leader")}` : ` – ${t("worker")}`}
            </span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}
