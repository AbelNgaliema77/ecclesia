"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error: signUpError } = await authClient.signUp.email({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    });
    if (signUpError) {
      setPending(false);
      setError(t("signUpFailed"));
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
      {error ? <FormAlert tone="error" message={error} /> : null}
      <Field id="name" label={t("name")}>
        <Input id="name" name="name" autoComplete="name" required maxLength={120} autoFocus />
      </Field>
      <Field id="email" label={t("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="password" label={t("password")} hint={t("passwordHint")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {t("signUp")}
      </Button>
    </form>
  );
}
