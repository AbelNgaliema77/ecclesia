import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { TwoFactorSettings } from "@/modules/account/two-factor-settings";
import { getChurchContext } from "@/server/context";

export const metadata: Metadata = { title: "Security" };

export default async function SecurityPage() {
  const context = await getChurchContext();
  const t = await getTranslations("account.security");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} lead={t("lead")} />
      <TwoFactorSettings enabled={context.twoFactorEnabled} required={context.financeLocked} />
    </div>
  );
}
