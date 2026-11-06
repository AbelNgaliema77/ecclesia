import { CalendarCheck2, HandCoins, UsersRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { Wordmark } from "@/components/shell/wordmark";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const [t, tn, ta] = await Promise.all([
    getTranslations("app"),
    getTranslations("nav"),
    getTranslations("auth"),
  ]);
  const chips = [
    { icon: UsersRound, label: tn("people") },
    { icon: CalendarCheck2, label: tn("attendance") },
    { icon: HandCoins, label: tn("finance") },
  ];
  return (
    <div className="grid min-h-dvh gap-3 p-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hero relative hidden overflow-hidden rounded-hero p-10 lg:flex lg:flex-col lg:justify-between">
        <Wordmark inverted />
        <div className="relative max-w-md">
          <p className="font-display text-[2.75rem] leading-[1.05] font-bold tracking-tight">
            {ta("verse")}
          </p>
          <p className="mt-4 text-sm font-medium text-hero-ink-soft">{ta("verseRef")}</p>
          <ul className="mt-10 flex flex-wrap gap-2">
            {chips.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="glass inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold"
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-hero-ink-soft">{t("tagline")}</p>
      </aside>
      <main className="flex flex-col px-3 py-4 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="lg:invisible">
            <Wordmark />
          </span>
          <LocaleSwitcher />
        </div>
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-sm py-12">{children}</div>
        </div>
      </main>
    </div>
  );
}
