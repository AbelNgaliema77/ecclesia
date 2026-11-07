import type { ExpenseStatus } from "@ecclesia/domain/finance";
import { useTranslations } from "next-intl";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const TONES: Record<ExpenseStatus, BadgeTone> = {
  submitted: "gold",
  approved: "brand",
  paid: "brandStrong",
  rejected: "danger",
  cancelled: "muted",
};

export function ExpenseStatusBadge({ status }: { status: ExpenseStatus }) {
  const t = useTranslations("finance.expenses.status");
  return <Badge tone={TONES[status]}>{t(status)}</Badge>;
}
