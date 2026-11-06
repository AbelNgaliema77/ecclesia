import { Compass } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="icon-tile size-14">
        <Compass aria-hidden className="size-6" />
      </span>
      <h1 className="text-[2rem] font-bold">{t("title")}</h1>
      <p className="max-w-sm text-ink-soft">{t("lead")}</p>
      <Link href="/" className={buttonClasses("primary")}>
        {t("back")}
      </Link>
    </div>
  );
}
