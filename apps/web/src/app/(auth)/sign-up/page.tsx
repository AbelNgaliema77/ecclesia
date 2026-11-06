import type { Metadata, Route } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { safeNext } from "@/lib/safe-next";
import { getSession } from "@/server/context";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create account" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignUpPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const email = typeof params.email === "string" ? params.email.slice(0, 254) : "";
  if (await getSession()) redirect(next as Route);
  const t = await getTranslations("auth");
  return (
    <>
      <h1 className="text-display font-bold">{t("signUpTitle")}</h1>
      <p className="mt-2 text-ink-soft">{t("signUpLead")}</p>
      <SignUpForm next={next === "/" ? null : next} email={email} />
      <p className="mt-8 text-sm text-ink-soft">
        {t("haveAccount")}{" "}
        <Link
          href={(next === "/" ? "/sign-in" : `/sign-in?next=${encodeURIComponent(next)}`) as Route}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {t("signInInstead")}
        </Link>
      </p>
    </>
  );
}
