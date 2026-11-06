import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/shell/locale-switcher";
import { Wordmark } from "@/components/shell/wordmark";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("app");
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-sanctuary-800 p-12 text-sanctuary-50 lg:flex lg:flex-col lg:justify-between">
        <Wordmark inverted />
        <div className="max-w-sm">
          <p className="font-display text-[2rem] leading-tight font-light">
            “Let all things be done decently and in order.”
          </p>
          <p className="mt-4 text-sm text-sanctuary-200">1 Corinthians 14:40</p>
        </div>
        <p className="text-sm text-sanctuary-200">{t("tagline")}</p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -bottom-24 size-[28rem] rounded-full border border-sanctuary-500/40"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -bottom-8 size-[18rem] rounded-full border border-candle-500/40"
        />
      </aside>
      <main className="flex flex-col px-6 py-8 sm:px-12">
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
