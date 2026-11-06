import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/context";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/");
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="text-display font-bold">{t("signUpTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("signUpLead")}</p>
      <SignUpForm />
      <p className="mt-8 text-sm text-ink-soft">
        {t("haveAccount")}{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t("signInInstead")}
        </Link>
      </p>
    </>
  );
}
