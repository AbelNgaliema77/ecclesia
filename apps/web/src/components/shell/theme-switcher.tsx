"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { cn } from "@/lib/cn";
import { THEMES, type Theme, themeClass } from "@/lib/theme";
import { setThemeAction } from "@/modules/preferences/actions";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

export function ThemeSwitcher({ current, className }: { current: Theme; className?: string }) {
  const t = useTranslations("shell.theme");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (theme: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    const cls = themeClass(theme);
    if (cls) root.classList.add(cls);
    startTransition(async () => {
      await setThemeAction(theme);
      router.refresh();
    });
  };

  return (
    <fieldset
      aria-label={t("label")}
      className={cn("inline-flex rounded-full bg-muted p-1 ring-1 ring-line ring-inset", className)}
      disabled={pending}
    >
      {THEMES.map((theme) => {
        const Icon = ICONS[theme];
        return (
          <button
            key={theme}
            type="button"
            aria-pressed={theme === current}
            aria-label={t(theme)}
            title={t(theme)}
            onClick={() => choose(theme)}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-full transition-colors",
              theme === current
                ? "bg-surface text-ink shadow-card"
                : "text-ink-faint hover:text-ink",
            )}
          >
            <Icon aria-hidden className="size-3.5" />
          </button>
        );
      })}
    </fieldset>
  );
}
