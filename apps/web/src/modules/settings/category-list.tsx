"use client";

import { nextPresetColor } from "@ecclesia/domain/shared";
import { ArrowDown, ArrowUp, EyeOff, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useTransition } from "react";
import { toast } from "sonner";
import { LocalizedNameFields } from "@/components/forms/localized-name-fields";
import { ActionButton } from "@/components/ui/action-button";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { localized } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { moveCategoryAction, saveCategoryAction, toggleCategoryAction } from "./actions";

type CategoryRow = {
  id: string;
  name: { en: string; fr: string };
  color: string;
  isActive: boolean;
};

function CategoryDialog({
  trigger,
  initial,
  defaultColor,
}: {
  trigger: (open: () => void) => ReactNode;
  initial?: CategoryRow;
  defaultColor: string;
}) {
  const t = useTranslations("settings.categories");
  const tr = useTranslations("settings.roles");
  const tc = useTranslations("common");
  return (
    <ActionDialog
      action={saveCategoryAction}
      hidden={initial ? { id: initial.id } : {}}
      trigger={trigger}
      title={initial ? t("editTitle", { name: initial.name.en }) : t("addTitle")}
      submitLabel={t("save")}
      successMessage={t("saved")}
    >
      {({ fieldError }) => (
        <>
          <LocalizedNameFields
            name="name"
            maxLength={40}
            labels={{ en: tr("nameEn"), fr: tr("nameFr"), optional: tc("optional") }}
            {...(initial ? { defaultValue: initial.name } : {})}
            error={fieldError("name.en")}
          />
          <ColorPicker
            name="color"
            label={t("color")}
            defaultValue={initial?.color ?? defaultColor}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function CategoryManager({
  items,
  readOnly,
}: {
  items: readonly CategoryRow[];
  readOnly: boolean;
}) {
  const t = useTranslations("settings.categories");
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const [moving, startMove] = useTransition();
  const active = items.filter((c) => c.isActive);
  const defaultColor = nextPresetColor(active.map((c) => c.color));

  const move = (id: string, direction: "up" | "down") =>
    startMove(async () => {
      const result = await moveCategoryAction(id, direction);
      if (result.status === "success") router.refresh();
      else toast.error(te("unexpected"));
    });

  return (
    <div className="flex flex-col gap-4">
      {readOnly ? null : (
        <div className="flex justify-end">
          <CategoryDialog
            defaultColor={defaultColor}
            trigger={(open) => (
              <Button onClick={open}>
                <Plus aria-hidden className="size-4" />
                {t("add")}
              </Button>
            )}
          />
        </div>
      )}
      <ul className="card divide-y divide-line">
        {items.map((item) => {
          const name = localized(item.name, locale);
          const index = active.findIndex((c) => c.id === item.id);
          return (
            <li
              key={item.id}
              className={cn("flex items-center gap-4 p-4", !item.isActive && "opacity-60")}
            >
              <span
                aria-hidden
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ background: item.color }}
              />
              <p className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
                <span className="truncate">{name}</span>
                {item.isActive ? null : <Badge tone="muted">{t("hidden")}</Badge>}
              </p>
              {readOnly ? null : (
                <div className="flex items-center gap-1">
                  {item.isActive ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={moving || index === 0}
                        onClick={() => move(item.id, "up")}
                        aria-label={t("moveUp", { name })}
                      >
                        <ArrowUp aria-hidden className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={moving || index === active.length - 1}
                        onClick={() => move(item.id, "down")}
                        aria-label={t("moveDown", { name })}
                      >
                        <ArrowDown aria-hidden className="size-4" />
                      </Button>
                    </>
                  ) : null}
                  <CategoryDialog
                    initial={item}
                    defaultColor={item.color}
                    trigger={(open) => (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={open}
                        aria-label={t("editTitle", { name })}
                      >
                        <Pencil aria-hidden className="size-4" />
                        <span className="hidden sm:inline">{tc("edit")}</span>
                      </Button>
                    )}
                  />
                  <ActionButton
                    action={toggleCategoryAction}
                    hidden={{ id: item.id, active: item.isActive ? "false" : "true" }}
                    successMessage={item.isActive ? t("hiddenToast") : t("shownToast")}
                  >
                    {item.isActive ? <EyeOff aria-hidden className="size-4" /> : null}
                    {item.isActive ? t("hide") : t("show")}
                  </ActionButton>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-ink-faint">{t("hiddenNote")}</p>
    </div>
  );
}
