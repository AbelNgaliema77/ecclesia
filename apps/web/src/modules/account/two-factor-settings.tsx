"use client";

import { Check, Copy, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { authClient } from "@/lib/auth-client";
import { useHydrated } from "@/lib/use-hydrated";

type Step =
  | { readonly kind: "idle" }
  | {
      readonly kind: "scan";
      readonly qr: string;
      readonly secret: string;
      readonly backupCodes: readonly string[];
    }
  | { readonly kind: "codes"; readonly backupCodes: readonly string[] }
  | { readonly kind: "disable" }
  | { readonly kind: "regenerate" };

const secretFrom = (uri: string) => new URL(uri).searchParams.get("secret") ?? "";

const groupSecret = (secret: string) => secret.replace(/(.{4})/g, "$1 ").trim();

export function TwoFactorSettings({ enabled, required }: { enabled: boolean; required: boolean }) {
  const t = useTranslations("account.security");
  const router = useRouter();
  const hydrated = useHydrated();
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = async () => {
    await authClient.getSession({ query: { disableCookieCache: true } });
    router.refresh();
  };

  const failure = (status: number | undefined) =>
    setError(
      status === 400 || status === 401
        ? t("wrongPassword")
        : status === 429
          ? t("tooMany")
          : t("failed"),
    );

  const startEnable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    const { data, error: enableError } = await authClient.twoFactor.enable({ password });
    setPending(false);
    if (enableError || !data || data.method !== "totp") return failure(enableError?.status);
    const qr = await QRCode.toDataURL(data.totpURI, {
      margin: 1,
      width: 220,
      errorCorrectionLevel: "M",
    });
    setStep({ kind: "scan", qr, secret: secretFrom(data.totpURI), backupCodes: data.backupCodes });
  };

  const confirmEnable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step.kind !== "scan") return;
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s+/g, "");
    setPending(true);
    setError(null);
    const { error: verifyError } = await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (verifyError) {
      setError(t("wrongCode"));
      return;
    }
    setStep({ kind: "codes", backupCodes: step.backupCodes });
    toast.success(t("enabled"));
    await refreshSession();
  };

  const disable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    const { error: disableError } = await authClient.twoFactor.disable({ password });
    setPending(false);
    if (disableError) return failure(disableError.status);
    setStep({ kind: "idle" });
    toast.success(t("disabled"));
    await refreshSession();
  };

  const regenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    setPending(true);
    setError(null);
    const { data, error: codesError } = await authClient.twoFactor.generateBackupCodes({
      password,
    });
    setPending(false);
    if (codesError || !data) return failure(codesError?.status);
    setStep({ kind: "codes", backupCodes: data.backupCodes });
  };

  const passwordForm = (onSubmit: (event: FormEvent<HTMLFormElement>) => void, submit: string) => (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 sm:max-w-sm">
      <Field id="password" label={t("password")} hint={t("passwordHint")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !hydrated}>
          {submit}
        </Button>
        {step.kind === "idle" ? null : (
          <Button
            variant="ghost"
            onClick={() => {
              setStep({ kind: "idle" });
              setError(null);
            }}
          >
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-start gap-4">
        <span className="icon-tile size-11">
          {enabled ? (
            <ShieldCheck aria-hidden className="size-5" />
          ) : (
            <ShieldAlert aria-hidden className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{t("twoFactorTitle")}</h2>
            <Badge tone={enabled ? "brand" : "gold"}>{enabled ? t("on") : t("off")}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{t("twoFactorLead")}</p>
        </div>
      </div>

      {required && !enabled ? <FormAlert tone="error" message={t("requiredForFinance")} /> : null}
      {error ? <FormAlert tone="error" message={error} /> : null}

      {step.kind === "idle" && enabled ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setStep({ kind: "regenerate" })}>
            {t("newBackupCodes")}
          </Button>
          <Button variant="ghost" onClick={() => setStep({ kind: "disable" })}>
            {t("turnOff")}
          </Button>
        </div>
      ) : null}

      {step.kind === "idle" && !enabled ? passwordForm(startEnable, t("turnOn")) : null}

      {step.kind === "scan" ? (
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center gap-3">
            <Image
              src={step.qr}
              alt={t("qrAlt")}
              width={220}
              height={220}
              unoptimized
              className="rounded-control bg-white p-2"
            />
            <p className="text-center text-xs text-ink-faint">{t("cantScan")}</p>
            <code
              className="rounded-control bg-muted px-3 py-2 text-sm tracking-wider"
              data-testid="totp-secret"
            >
              {groupSecret(step.secret)}
            </code>
          </div>
          <form onSubmit={confirmEnable} className="flex flex-col gap-4 sm:max-w-sm">
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-soft">
              <li>{t("stepInstall")}</li>
              <li>{t("stepScan")}</li>
              <li>{t("stepCode")}</li>
            </ol>
            <Field id="code" label={t("code")}>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                required
                autoFocus
              />
            </Field>
            <Button type="submit" disabled={pending}>
              {t("confirm")}
            </Button>
          </form>
        </div>
      ) : null}

      {step.kind === "codes" ? (
        <BackupCodes codes={step.backupCodes} onDone={() => setStep({ kind: "idle" })} />
      ) : null}
      {step.kind === "disable" ? passwordForm(disable, t("turnOff")) : null}
      {step.kind === "regenerate" ? passwordForm(regenerate, t("newBackupCodes")) : null}
    </section>
  );
}

function BackupCodes({ codes, onDone }: { codes: readonly string[]; onDone: () => void }) {
  const t = useTranslations("account.security");
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-bold">{t("backupTitle")}</h3>
        <p className="mt-1 text-sm text-ink-soft">{t("backupLead")}</p>
      </div>
      <ul
        className="grid grid-cols-2 gap-2 rounded-card bg-muted p-4 font-mono text-sm sm:grid-cols-5"
        data-testid="backup-codes"
      >
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          }}
        >
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copied ? t("copied") : t("copy")}
        </Button>
        <a
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}
          download="ecclesia-backup-codes.txt"
          className="inline-flex h-10 items-center gap-2 rounded-control px-4 text-sm font-semibold hover:bg-muted"
        >
          <Download aria-hidden className="size-4" />
          {t("download")}
        </a>
        <Button onClick={onDone}>{t("saved")}</Button>
      </div>
    </div>
  );
}
