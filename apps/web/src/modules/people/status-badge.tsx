import type { PersonStatus } from "@ecclesia/domain/people";
import { useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const TONES: Record<PersonStatus, BadgeTone> = {
  visitor: "gold",
  regular: "neutral",
  member: "brand",
  worker: "brand",
  leader: "brandStrong",
  inactive: "muted",
};

export function StatusBadge({ status }: { status: PersonStatus }) {
  const t = useTranslations("people.status");
  return <Badge tone={TONES[status]}>{t(status)}</Badge>;
}
