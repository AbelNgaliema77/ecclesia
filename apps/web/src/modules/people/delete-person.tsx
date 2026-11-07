"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { deletePersonAction } from "./actions";

export function DeletePersonButton({ id, name }: { id: string; name: string }) {
  const t = useTranslations("people");
  return (
    <ConfirmAction
      action={deletePersonAction}
      hidden={{ id }}
      trigger={(open) => (
        <Button variant="secondary" size="sm" onClick={open}>
          <Trash2 aria-hidden className="size-4" />
          {t("delete")}
        </Button>
      )}
      title={t("deleteTitle", { name })}
      description={t("deleteLead")}
      confirmLabel={t("delete")}
      successMessage={t("deleted")}
    />
  );
}
