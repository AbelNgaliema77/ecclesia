"use client";

import { EARLIEST_JOINED_YEAR, GENDERS } from "@ecclesia/domain/people";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type ReactNode, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { createPersonAction, updatePersonAction } from "./actions";

export type PersonFormValues = {
  id?: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  joinedYear: number | null;
};

export type TeamOption = { readonly id: string; readonly name: string };

const EMPTY: PersonFormValues = {
  firstName: "",
  lastName: "",
  gender: null,
  email: null,
  phone: null,
  dateOfBirth: null,
  joinedYear: null,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="card grid gap-x-8 gap-y-5 p-5 sm:p-6 md:grid-cols-[11rem_minmax(0,1fr)]">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden className="font-display text-lg font-bold">
        {title}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function PersonForm({
  initial = EMPTY,
  disabled = false,
  teams = [],
  teamRequired = false,
}: {
  initial?: PersonFormValues;
  disabled?: boolean;
  teams?: readonly TeamOption[];
  teamRequired?: boolean;
}) {
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const router = useRouter();
  const isEdit = Boolean(initial.id);
  const [state, action, pending] = useActionState(
    isEdit ? updatePersonAction : createPersonAction,
    idleState,
  );
  const { fieldError, formError, invalid } = useActionMessages(state);

  useEffect(() => {
    if (state.status !== "success") return;
    toast.success(t("saved"));
    if (!isEdit) router.push(`/people/${state.data.id}`);
  }, [state, isEdit, router, t]);

  const thisYear = new Date().getFullYear();

  const field = (name: string, label: string, control: ReactNode, wide = false) => (
    <Field
      id={name}
      label={label}
      error={fieldError(name)}
      className={wide ? "sm:col-span-2" : undefined}
    >
      {control}
    </Field>
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {formError ? <FormAlert tone="error" message={formError} /> : null}

      <fieldset disabled={disabled || pending} className="flex flex-col gap-4">
        <Section title={t("sections.identity")}>
          {field(
            "firstName",
            t("fields.firstName"),
            <Input
              id="firstName"
              name="firstName"
              defaultValue={initial.firstName}
              required
              maxLength={80}
              autoComplete="given-name"
              aria-invalid={invalid("firstName")}
            />,
          )}
          {field(
            "lastName",
            t("fields.lastName"),
            <Input
              id="lastName"
              name="lastName"
              defaultValue={initial.lastName}
              required
              maxLength={80}
              autoComplete="family-name"
              aria-invalid={invalid("lastName")}
            />,
          )}
          {field(
            "gender",
            t("fields.gender"),
            <Select id="gender" name="gender" defaultValue={initial.gender ?? ""}>
              <option value="">{t("notSpecified")}</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {t(`gender.${g}`)}
                </option>
              ))}
            </Select>,
          )}
          {field(
            "dateOfBirth",
            t("fields.dateOfBirth"),
            <Input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              defaultValue={initial.dateOfBirth ?? ""}
              aria-invalid={invalid("dateOfBirth")}
            />,
          )}
        </Section>

        <Section title={t("sections.contact")}>
          {field(
            "phone",
            t("fields.phone"),
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={initial.phone ?? ""}
              autoComplete="tel"
              aria-invalid={invalid("phone")}
            />,
          )}
          {field(
            "email",
            t("fields.email"),
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={initial.email ?? ""}
              autoComplete="email"
              aria-invalid={invalid("email")}
            />,
          )}
        </Section>

        <Section title={t("sections.church")}>
          {field(
            "joinedYear",
            t("fields.joinedYear"),
            <Input
              id="joinedYear"
              name="joinedYear"
              type="number"
              inputMode="numeric"
              min={EARLIEST_JOINED_YEAR}
              max={thisYear}
              step={1}
              placeholder={String(thisYear)}
              defaultValue={initial.joinedYear ?? ""}
              aria-invalid={invalid("joinedYear")}
            />,
          )}
          {isEdit || teams.length === 0
            ? null
            : field(
                "teamId",
                t("fields.team"),
                <Select
                  id="teamId"
                  name="teamId"
                  defaultValue={teamRequired && teams.length === 1 ? teams[0]?.id : ""}
                  required={teamRequired}
                  aria-invalid={invalid("teamId")}
                >
                  <option value="">{teamRequired ? t("chooseTeam") : t("noTeamYet")}</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>,
              )}
        </Section>
      </fieldset>

      {disabled ? null : (
        <div className="sticky bottom-28 z-10 flex justify-end lg:bottom-4">
          <Button type="submit" size="lg" disabled={pending} className="shadow-pop">
            {pending ? tc("saving") : t("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
