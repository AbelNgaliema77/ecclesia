"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export function ForgotPasswordForm({ emailAvailable }: { emailAvailable: boolean }) {
  const t = useTranslations("auth.forgot");
  const ta = useTranslations("auth");
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error" | "limited">("idle");
  const hydrated = useHydrated();

  if (!emailAvailable) {
    return (
      <div className="mt-8">
        <FormAlert tone="error" message={t("unavailable")} />
      </div>
    );
  }

  if (state === "sent") {
    return (
      <div className="mt-8">
        <FormAlert tone="success" message={t("sent")} />
      </div>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    setState("pending");
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setState(!error || error.status === 400 ? "sent" : error.status === 429 ? "limited" : "error");
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
      {state === "error" ? <FormAlert tone="error" message={ta("signInUnavailable")} /> : null}
      {state === "limited" ? <FormAlert tone="error" message={ta("tooManyAttempts")} /> : null}
      <Field id="email" label={ta("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Button type="submit" size="lg" disabled={state === "pending" || !hydrated} className="mt-2">
        {t("submit")}
      </Button>
    </form>
  );
}
