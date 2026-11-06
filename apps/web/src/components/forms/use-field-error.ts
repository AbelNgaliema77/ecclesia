"use client";

import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";

export function useActionMessages<T>(state: ActionState<T>) {
  const t = useTranslations("errors");

  const translate = (code: string) => (t.has(code) ? t(code) : t("generic"));

  const fieldError = (name: string): string | undefined => {
    if (state.status !== "error") return undefined;
    const first = state.fieldErrors?.[name]?.[0];
    return first ? translate(first) : undefined;
  };

  const formError =
    state.status === "error"
      ? translate(state.code === "validation" ? "validation" : state.code)
      : null;

  const invalid = (name: string) => (fieldError(name) ? true : undefined);

  return { fieldError, formError, invalid };
}
