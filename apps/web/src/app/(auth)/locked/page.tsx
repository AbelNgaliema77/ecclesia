import { getTranslations } from "next-intl/server";
import { requireSession } from "@/server/context";
import { SignOutButton } from "./sign-out-button";

export default async function LockedPage() {
  await requireSession();
  const t = await getTranslations("locked");
  return (
    <>
      <h1 className="text-display font-bold">{t("title")}</h1>
      <p className="mt-3 leading-relaxed text-ink-soft">{t("lead")}</p>
      <SignOutButton label={t("signOut")} />
    </>
  );
}
