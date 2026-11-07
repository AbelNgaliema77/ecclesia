import type { people } from "@ecclesia/db/repositories";
import type { PersonStatus } from "@ecclesia/domain/people";
import { Crown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { localized } from "@/i18n/config";

const TONES: Record<PersonStatus, BadgeTone> = {
  visitor: "gold",
  regular: "neutral",
  member: "brand",
  inactive: "muted",
};

export function StatusBadge({ status }: { status: PersonStatus }) {
  const t = useTranslations("people.status");
  return <Badge tone={TONES[status]}>{t(status)}</Badge>;
}

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
