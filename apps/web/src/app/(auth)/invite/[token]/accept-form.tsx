"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { acceptInvitationAction } from "@/modules/members/actions";

export function AcceptInvitationForm({ token, signedInAs }: { token: string; signedInAs: string }) {
  const t = useTranslations("invite");
  const [state, action, pending] = useActionState(acceptInvitationAction, idleState);
  const { formError } = useActionMessages(state);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <p className="text-sm text-ink-faint">{signedInAs}</p>
      <Button type="submit" size="lg" disabled={pending}>
        {t("accept")}
      </Button>
    </form>
  );
}
