import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireSession } from "@/server/context";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Set up your church" };

export default async function OnboardingPage() {
  await requireSession();
  const t = await getTranslations("onboarding");
  return (
    <>
      <h1 className="font-display text-display font-medium tracking-tight">{t("title")}</h1>
      <p className="mt-2 leading-relaxed text-ink-soft">{t("lead")}</p>
      <OnboardingForm />
    </>
  );
}
