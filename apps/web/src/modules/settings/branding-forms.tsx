"use client";

import {
  BRAND_THEMES,
  type BrandTheme,
  LOGO_TYPES,
  MAX_LOGO_BYTES,
} from "@ecclesia/domain/settings";
import { Check, ImageUp, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { ChurchBadge } from "@/components/shell/church-badge";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { type ActionState, idleState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { useHydrated } from "@/lib/use-hydrated";
import { removeLogoAction, saveBrandThemeAction, uploadLogoAction } from "./branding-actions";

function useSavedToast(state: ActionState<null>, message: string) {
  const router = useRouter();
  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(message);
    router.refresh();
  }, [state, message, router]);
}

export function ThemeForm({ current, disabled }: { current: BrandTheme; disabled: boolean }) {
  const t = useTranslations("settings.branding");
  const tc = useTranslations("common");
  const [selected, setSelected] = useState<BrandTheme>(current);
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(saveBrandThemeAction, idleState);
  const { formError } = useActionMessages(state);
  useSavedToast(state, t("themeSaved"));

  return (
    <form action={action} className="card flex flex-col gap-5 p-5 sm:p-6">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <fieldset disabled={disabled || pending || !hydrated}>
        <legend className="sr-only">{t("themeTitle")}</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BRAND_THEMES.map((theme) => (
            <label
              key={theme}
              data-brand={theme === "forest" ? undefined : theme}
              className={cn(
                "relative flex cursor-pointer items-center gap-3 rounded-card border p-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
                selected === theme ? "border-brand bg-brand-soft" : "border-line hover:bg-muted",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={theme}
                checked={selected === theme}
                onChange={() => setSelected(theme)}
                className="sr-only"
              />
              <span aria-hidden className="flex -space-x-1.5">
                <span className="size-7 rounded-full bg-gradient-to-br from-[var(--hero-from)] to-[var(--hero-to)] ring-2 ring-surface" />
                <span className="size-7 rounded-full bg-brand ring-2 ring-surface" />
                <span className="size-7 rounded-full bg-brand-soft ring-2 ring-surface" />
              </span>
              <span className="flex-1 text-sm font-semibold">{t(`themes.${theme}`)}</span>
              {selected === theme ? (
                <Check aria-hidden className="size-4 text-brand-soft-ink" />
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || pending || selected === current}>
          {pending ? tc("saving") : t("saveTheme")}
        </Button>
      </div>
    </form>
  );
}

export function LogoForm({
  churchName,
  logoVersion,
  disabled,
}: {
  churchName: string;
  logoVersion: string | null;
  disabled: boolean;
}) {
  const t = useTranslations("settings.branding");
  const te = useTranslations("errors");
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(uploadLogoAction, idleState);
  const [removeState, removeAction, removing] = useActionState(removeLogoAction, idleState);
  const { formError } = useActionMessages(state);
  const { formError: removeError } = useActionMessages(removeState);
  useSavedToast(state, t("logoSaved"));
  useSavedToast(removeState, t("logoRemoved"));
  const hydrated = useHydrated();
  const busy = disabled || pending || removing || !hydrated;
  const error = clientError ?? formError ?? removeError;

  return (
    <div className="card flex flex-col gap-5 p-5 sm:p-6">
      {error ? <FormAlert tone="error" message={error} /> : null}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ChurchBadge name={churchName} logoVersion={logoVersion} className="size-20 text-2xl" />
        <div className="flex-1">
          <p className="font-semibold">{logoVersion ? t("logoCurrent") : t("logoNone")}</p>
          <p className="mt-1 text-sm text-ink-faint">{t("logoHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form ref={form} action={action}>
            <input
              ref={input}
              type="file"
              name="logo"
              accept={LOGO_TYPES.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_LOGO_BYTES) {
                  setClientError(te("branding.logoTooLarge"));
                  event.target.value = "";
                  return;
                }
                setClientError(null);
                form.current?.requestSubmit();
              }}
            />
            <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
              <ImageUp aria-hidden className="size-4" />
              {pending ? t("uploading") : logoVersion ? t("replaceLogo") : t("uploadLogo")}
            </Button>
          </form>
          {logoVersion ? (
            <form action={removeAction}>
              <Button type="submit" variant="ghost" disabled={busy}>
                <Trash2 aria-hidden className="size-4" />
                {t("removeLogo")}
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
