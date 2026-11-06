import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CategoryManager } from "@/modules/settings/category-list";
import { loadCategories } from "@/modules/settings/queries";
import { SettingsSection } from "@/modules/settings/section";

export const metadata: Metadata = { title: "Attendance categories" };

export default async function CategoriesPage() {
  const [data, t] = await Promise.all([loadCategories(), getTranslations("settings.categories")]);
  return (
    <SettingsSection title={t("title")} lead={t("lead")}>
      <CategoryManager
        readOnly={data.readOnly}
        items={data.categories.map((c) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          isActive: c.isActive,
        }))}
      />
    </SettingsSection>
  );
}
