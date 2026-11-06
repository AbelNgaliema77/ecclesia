import { CircleAlert, MailCheck } from "lucide-react";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";
import { localized } from "@/i18n/config";
import { loadInvitation } from "@/modules/members/queries";
import { getSession } from "@/server/context";
import { SignOutButton } from "../../locked/sign-out-button";
import { AcceptInvitationForm } from "./accept-form";

export const metadata: Metadata = { title: "Invitation", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, session, t, locale] = await Promise.all([
    loadInvitation(token),
    getSession(),
    getTranslations("invite"),
    getLocale(),
  ]);

  if (invitation.state !== "pending") {
    const message =
      invitation.state === "expired"
        ? t("expired")
        : invitation.state === "revoked"
          ? t("revoked")
          : invitation.state === "accepted"
            ? t("used")
            : t("notFound");
    return (
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex size-12 items-center justify-center rounded-control bg-danger-soft text-danger">
          <CircleAlert aria-hidden className="size-5" />
        </span>
        <p className="text-lg leading-relaxed text-ink-soft">{message}</p>
        <Link href="/" className={buttonClasses("secondary")}>
          {t("openApp")}
        </Link>
      </div>
    );
  }

  const next = `/invite/${token}`;
  const sameEmail = session ? session.user.email.toLowerCase() === invitation.email : false;

  return (
    <div className="flex flex-col gap-6">
      <span className="icon-tile size-12">
        <MailCheck aria-hidden className="size-5" />
      </span>
      <div>
        <h1 className="text-display font-bold">{t("title", { church: invitation.churchName })}</h1>
        <p className="mt-3 leading-relaxed text-ink-soft">
          {t("lead", { role: localized(invitation.roleName, locale), email: invitation.email })}
        </p>
      </div>

      {!session ? (
        <div className="flex flex-col gap-2">
          <Link
            href={
              `/sign-up?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invitation.email)}` as Route
            }
            className={buttonClasses("primary", "lg")}
          >
            {t("createAccount")}
          </Link>
          <Link
            href={`/sign-in?next=${encodeURIComponent(next)}` as Route}
            className={buttonClasses("secondary", "lg")}
          >
            {t("signIn")}
          </Link>
        </div>
      ) : sameEmail ? (
        <AcceptInvitationForm
          token={token}
          signedInAs={t("acceptLead", { email: session.user.email })}
        />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <p className="rounded-control bg-gold-soft px-4 py-3 text-sm font-medium text-gold-ink">
            {t("wrongAccount", { email: invitation.email, current: session.user.email })}
          </p>
          <SignOutButton label={t("signOut")} />
        </div>
      )}
    </div>
  );
}
