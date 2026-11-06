"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";

const safeNext = (value: string | null): string =>
  value?.startsWith("/") && !value.startsWith("//") ? value : "/";

export function SignInForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (signInError) {
      setPending(false);
      setError(t("invalidCredentials"));
      return;
    }
    router.replace(safeNext(params.get("next")) as "/");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
      {error ? <FormAlert tone="error" message={error} /> : null}
      <Field id="email" label={t("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <Field id="password" label={t("password")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {t("signIn")}
      </Button>
    </form>
  );
}
