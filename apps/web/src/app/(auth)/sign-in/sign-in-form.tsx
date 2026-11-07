"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";
import { useHydrated } from "@/lib/use-hydrated";

export function SignInForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const hydrated = useHydrated();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { data: signedIn, error: signInError } = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    if (signInError) {
      setPending(false);
      setError(
        signInError.status === 401
          ? t("invalidCredentials")
          : signInError.status === 429
            ? t("tooManyAttempts")
            : t("signInUnavailable"),
      );
      return;
    }
    if (signedIn && "twoFactorRedirect" in signedIn && signedIn.twoFactorRedirect) return;
    router.replace(safeNext(params.get("next") ?? undefined) as "/");
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
      <Link
        href="/forgot-password"
        className="-mt-2 self-end text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        {t("forgotLink")}
      </Link>
      <Button type="submit" size="lg" disabled={pending || !hydrated} className="mt-2">
        {t("signIn")}
      </Button>
    </form>
  );
}
