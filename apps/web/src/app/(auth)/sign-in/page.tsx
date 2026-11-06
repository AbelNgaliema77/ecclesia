import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { env } from "@/server/env";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage() {
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="text-display font-bold">{t("signInTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("signInLead")}</p>
      <Suspense>
        <SignInForm />
      </Suspense>
      <p className="mt-8 text-sm text-ink-soft">
        {t("noAccount")}{" "}
        <Link
          href="/sign-up"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t("createOne")}
        </Link>
      </p>
      {env.ECCLESIA_SHOW_DEMO_LOGIN ? (
        <p className="mt-6 rounded-control bg-gold-soft px-4 py-3 text-sm font-medium text-gold-ink">
          {t("demoHint")}
        </p>
      ) : null}
    </>
  );
}
