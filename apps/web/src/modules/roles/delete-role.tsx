"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { deleteRoleAction } from "./actions";

export function DeleteRole({ id, name }: { id: string; name: string }) {
  const t = useTranslations("settings.roles");
  return (
    <ConfirmAction
      action={deleteRoleAction}
      hidden={{ id }}
      title={t("deleteTitle", { name })}
      description={t("deleteLead")}
      confirmLabel={t("delete")}
      successMessage={t("deleted")}
      trigger={(open) => (
        <Button variant="secondary" onClick={open}>
          <Trash2 aria-hidden className="size-4 text-danger" />
          {t("delete")}
        </Button>
      )}
    />
  );
}
