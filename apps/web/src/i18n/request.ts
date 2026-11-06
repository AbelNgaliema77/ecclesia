import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isLocale, LOCALE_COOKIE, localeFromAcceptLanguage } from "./config";

export default getRequestConfig(async () => {
  const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(fromCookie)
    ? fromCookie
    : localeFromAcceptLanguage((await headers()).get("accept-language"));

  return {
    locale,
    timeZone: "Africa/Johannesburg",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
