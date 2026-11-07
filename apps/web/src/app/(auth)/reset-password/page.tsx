import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { FormAlert } from "@/components/ui/form-alert";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : null;
  const t = await getTranslations("auth.reset");
  return (
    <>
      <h1 className="text-display font-bold">{t("title")}</h1>
      {token && params.error === undefined ? (
        <>
          <p className="mt-2 text-ink-soft">{t("lead")}</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <div className="mt-8 flex flex-col gap-6">
          <FormAlert tone="error" message={t("invalid")} />
          <Link
            href="/forgot-password"
            className="font-semibold text-accent underline-offset-4 hover:underline"
          >
            {t("again")}
          </Link>
        </div>
      )}
    </>
  );
}
