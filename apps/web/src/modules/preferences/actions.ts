"use server";

import { platform } from "@ecclesia/db/repositories";
import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { isTheme, THEME_COOKIE } from "@/lib/theme";
import { ACTIVE_CHURCH_COOKIE, getChurchContext, getSession } from "@/server/context";
import { db } from "@/server/db";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function setLocaleAction(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    maxAge: ONE_YEAR,
    sameSite: "lax",
    path: "/",
  });
  const session = await getSession();
  if (session) await platform.setUserLocale(db, session.user.id, locale);
}

export async function switchChurchAction(churchId: string): Promise<void> {
  const context = await getChurchContext();
  if (!context.memberships.some((m) => m.churchId === churchId)) return;
  (await cookies()).set(ACTIVE_CHURCH_COOKIE, churchId, {
    maxAge: ONE_YEAR,
    sameSite: "lax",
    httpOnly: true,
    path: "/",
  });
}

export async function setThemeAction(theme: string): Promise<void> {
  if (!isTheme(theme)) return;
  (await cookies()).set(THEME_COOKIE, theme, { maxAge: ONE_YEAR, sameSite: "lax", path: "/" });
}
