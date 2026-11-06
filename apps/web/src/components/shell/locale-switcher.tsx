"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { LOCALES } from "@/i18n/config";
import { cn } from "@/lib/cn";
import { setLocaleAction } from "@/modules/preferences/actions";

const LABELS: Record<(typeof LOCALES)[number], string> = { en: "English", fr: "Français" };

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("shell");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <fieldset
      aria-label={t("language")}
      className={cn("inline-flex rounded-full border border-line-strong p-0.5 text-xs", className)}
      disabled={pending}
    >
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={option === locale}
          title={LABELS[option]}
          onClick={() =>
            startTransition(async () => {
              await setLocaleAction(option);
              router.refresh();
            })
          }
          className={cn(
            "rounded-full px-2.5 py-1 font-medium uppercase transition-colors",
            option === locale ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
          )}
        >
          {option}
        </button>
      ))}
    </fieldset>
  );
}
