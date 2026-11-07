import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/server/context";
import { emailMode } from "@/server/email";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  if (await getSession()) redirect("/");
  const t = await getTranslations("auth.forgot");
  return (
    <>
      <h1 className="text-display font-bold">{t("title")}</h1>
      <p className="mt-2 text-ink-soft">{t("lead")}</p>
      <ForgotPasswordForm emailAvailable={emailMode !== "disabled"} />
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
