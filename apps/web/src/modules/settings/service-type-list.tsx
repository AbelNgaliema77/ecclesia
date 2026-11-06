"use client";

import { CalendarClock, EyeOff, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { localized } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { weekdayName } from "@/lib/weekdays";
import { toggleServiceTypeAction } from "./actions";
import { ServiceTypeDialog } from "./service-type-dialog";

type ServiceTypeRow = {
  id: string;
  name: { en: string; fr: string };
  dayOfWeek: number | null;
  startsAt: string | null;
  isActive: boolean;
};

export function AddServiceTypeButton() {
  const t = useTranslations("settings.services");
  return (
    <ServiceTypeDialog
      trigger={(open) => (
        <Button onClick={open}>
          <Plus aria-hidden className="size-4" />
          {t("add")}
        </Button>
      )}
    />
  );
}

export function ServiceTypeList({
  items,
  readOnly,
}: {
  items: readonly ServiceTypeRow[];
  readOnly: boolean;
}) {
  const t = useTranslations("settings.services");
  const tc = useTranslations("common");
  const locale = useLocale();
  return (
    <ul className="card divide-y divide-line">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn("flex items-center gap-4 p-4", !item.isActive && "opacity-60")}
        >
          <span className="icon-tile size-11">
            <CalendarClock aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-semibold">
              <span className="truncate">{localized(item.name, locale)}</span>
              {item.isActive ? null : <Badge tone="muted">{t("hidden")}</Badge>}
            </p>
            <p className="text-sm text-ink-faint">
              {item.dayOfWeek === null ? t("anyDay") : weekdayName(item.dayOfWeek, locale)}
              {item.startsAt ? `, ${item.startsAt.slice(0, 5)}` : ""}
            </p>
          </div>
          {readOnly ? null : (
            <div className="flex items-center gap-1">
              <ServiceTypeDialog
                initial={item}
                trigger={(open) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={open}
                    aria-label={t("editTitle", { name: localized(item.name, locale) })}
                  >
                    <Pencil aria-hidden className="size-4" />
                    <span className="hidden sm:inline">{tc("edit")}</span>
                  </Button>
                )}
              />
              <ActionButton
                action={toggleServiceTypeAction}
                hidden={{ id: item.id, active: item.isActive ? "false" : "true" }}
                successMessage={item.isActive ? t("hiddenToast") : t("shownToast")}
              >
                {item.isActive ? <EyeOff aria-hidden className="size-4" /> : null}
                {item.isActive ? t("hide") : t("show")}
              </ActionButton>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
