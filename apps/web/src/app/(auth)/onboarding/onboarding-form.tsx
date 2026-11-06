"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { createChurchAction } from "@/modules/onboarding/actions";

const toSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export function OnboardingForm() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, action, pending] = useActionState(createChurchAction, idleState);
  const { fieldError, formError, invalid } = useActionMessages(state);
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form action={action} className="mt-8 flex flex-col gap-5">
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      <Field id="name" label={t("churchName")} error={fieldError("name")}>
        <Input
          id="name"
          name="name"
          required
          autoFocus
          maxLength={120}
          aria-invalid={invalid("name")}
          onChange={(e) => {
            if (!slugEdited) setSlug(toSlug(e.target.value));
          }}
        />
      </Field>
      <Field id="slug" label={t("slug")} hint={t("slugHint")} error={fieldError("slug")}>
        <Input
          id="slug"
          name="slug"
          required
          value={slug}
          aria-invalid={invalid("slug")}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(toSlug(e.target.value));
          }}
        />
      </Field>
      <Field id="defaultLocale" label={t("language")}>
        <Select id="defaultLocale" name="defaultLocale" defaultValue={locale}>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </Select>
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="mt-2">
        {pending ? tc("saving") : t("submit")}
      </Button>
    </form>
  );
}
