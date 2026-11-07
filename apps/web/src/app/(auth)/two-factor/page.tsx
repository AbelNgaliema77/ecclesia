import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = { title: "Two-step verification" };

export default async function TwoFactorPage() {
  const t = await getTranslations("auth.twoFactor");
  return (
    <>
      <h1 className="text-display font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink-soft">{t("lead")}</p>
      <TwoFactorForm />
      <p className="mt-8 text-sm text-ink-soft">
        <Link
          href="/sign-in"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t("back")}
        </Link>
      </p>
    </>
  );
}
