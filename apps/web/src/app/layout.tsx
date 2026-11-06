import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { isTheme, THEME_COOKIE, themeClass } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ecclesia", template: "%s – Ecclesia" },
  description: "Church management for people, teams, attendance and stewardship.",
  applicationName: "Ecclesia",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, title: "Ecclesia", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f6f4" },
    { media: "(prefers-color-scheme: dark)", color: "#070e0b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [locale, store] = await Promise.all([getLocale(), cookies()]);
  const stored = store.get(THEME_COOKIE)?.value;
  const theme = isTheme(stored) ? stored : "system";

  return (
    <html lang={locale} className={themeClass(theme) || undefined} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
