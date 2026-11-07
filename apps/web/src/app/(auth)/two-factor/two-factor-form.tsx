"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";
import { useHydrated } from "@/lib/use-hydrated";

export function TwoFactorForm() {
  const t = useTranslations("auth.twoFactor");
  const router = useRouter();
  const params = useSearchParams();
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"app" | "backup">("app");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const code = String(data.get("code") ?? "").replace(/\s+/g, "");
    setPending(true);
    setError(null);
    const { error: verifyError } =
      mode === "app"
        ? await authClient.twoFactor.verifyTotp({ code, trustDevice: data.get("trust") === "on" })
        : await authClient.twoFactor.verifyBackupCode({
            code,
            trustDevice: data.get("trust") === "on",
          });
    if (verifyError) {
      setPending(false);
      setError(
        verifyError.status === 429
          ? t("tooMany")
          : verifyError.status === 401 &&
              /expired|invalid two factor cookie/i.test(verifyError.message ?? "")
            ? t("expired")
            : t("invalid"),
      );
      return;
    }
    router.replace(safeNext(params.get("next") ?? undefined) as "/");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" noValidate>
      {error ? <FormAlert tone="error" message={error} /> : null}
      <Field id="code" label={mode === "app" ? t("appCode") : t("backupCode")}>
        <Input
          key={mode}
          id="code"
          name="code"
          inputMode={mode === "app" ? "numeric" : "text"}
          autoComplete="one-time-code"
          pattern={mode === "app" ? "[0-9 ]{6,7}" : undefined}
          maxLength={mode === "app" ? 7 : 24}
          required
          autoFocus
        />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-ink-soft">
        <input type="checkbox" name="trust" className="size-4 accent-[var(--brand)]" />
        {t("trust")}
      </label>
      <Button type="submit" size="lg" disabled={pending || !hydrated} className="mt-2">
        {t("submit")}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === "app" ? "backup" : "app");
          setError(null);
        }}
        className="self-start text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        {mode === "app" ? t("useBackup") : t("useApp")}
      </button>
    </form>
  );
}
