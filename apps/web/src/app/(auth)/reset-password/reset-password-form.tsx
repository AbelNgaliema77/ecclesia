"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth.reset");
  const ta = useTranslations("auth");
  const [state, setState] = useState<"idle" | "pending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const hydrated = useHydrated();

  if (state === "done") {
    return (
      <div className="mt-8 flex flex-col gap-6">
        <FormAlert tone="success" message={t("done")} />
        <Link href="/sign-in" className={buttonClasses("primary", "lg")}>
          {ta("signIn")}
        </Link>
      </div>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password !== String(data.get("confirm") ?? "")) {
      setError(t("mismatch"));
      return;
    }
    if (password.length < 10) {
      setError(ta("passwordHint"));
      return;
    }
    setError(null);
    setState("pending");
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    if (resetError) {
      setState("idle");
      setError(resetError.status === 400 ? t("invalid") : ta("signInUnavailable"));
      return;
    }
    setState("done");
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
      {error ? <FormAlert tone="error" message={error} /> : null}
      <Field id="password" label={t("password")} hint={ta("passwordHint")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
          autoFocus
        />
      </Field>
      <Field id="confirm" label={t("confirm")}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          maxLength={128}
          required
        />
      </Field>
      <Button type="submit" size="lg" disabled={state === "pending" || !hydrated} className="mt-2">
        {t("submit")}
      </Button>
    </form>
  );
}
