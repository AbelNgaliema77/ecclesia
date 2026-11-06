"use client";

import {
  ALLOWED_SCOPES,
  type Grant,
  PERMISSION_GROUPS,
  type Permission,
  type Scope,
} from "@ecclesia/domain/access";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { LocalizedNameFields } from "@/components/forms/localized-name-fields";
import { useActionMessages } from "@/components/forms/use-field-error";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { idleState } from "@/lib/action-state";
import { cn } from "@/lib/cn";
import { saveRoleAction } from "./actions";

type RoleEditorProps = {
  id: string | null;
  name: { en: string; fr: string } | null;
  grants: readonly Grant[];
  locked: boolean;
};

const permissionKey = (permission: Permission) => permission.replace(".", "_");

export function RoleEditor({ id, name, grants, locked }: RoleEditorProps) {
  const t = useTranslations("settings.roles");
  const tc = useTranslations("common");
  const [state, action, pending] = useActionState(saveRoleAction, idleState);
  const { fieldError, formError } = useActionMessages(state);
  const scopes: Partial<Record<Permission, Scope>> = Object.fromEntries(
    grants.map((g) => [g.permission, g.scope]),
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {id ? <input type="hidden" name="id" value={id} /> : null}
      {formError ? <FormAlert tone="error" message={formError} /> : null}
      {locked ? (
        <p className="flex items-center gap-2 rounded-control bg-gold-soft px-4 py-3 text-sm font-medium text-gold-ink">
          <Lock aria-hidden className="size-4" />
          {t("readOnly")}
        </p>
      ) : null}

      <fieldset disabled={locked || pending} className="flex flex-col gap-4">
        <div className="card p-5 sm:p-6">
          <LocalizedNameFields
            name="name"
            labels={{ en: t("nameEn"), fr: t("nameFr"), optional: tc("optional") }}
            {...(name ? { defaultValue: name } : {})}
            error={fieldError("name.en")}
          />
        </div>

        {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
          <section key={group} className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">{t(`groups.${group}`)}</h2>
            <ul className="mt-3 divide-y divide-line">
              {permissions.map((permission) => {
                const options: ("" | Scope)[] = ["", ...ALLOWED_SCOPES[permission]];
                return (
                  <li
                    key={permission}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <fieldset className="contents">
                      <legend className="text-[0.9375rem] font-medium">
                        {t(`permission.${permissionKey(permission)}`)}
                      </legend>
                      <div className="inline-flex flex-wrap gap-1 rounded-full bg-muted p-1 ring-1 ring-line ring-inset">
                        {options.map((scope) => (
                          <label key={scope || "none"} className="cursor-pointer">
                            <input
                              type="radio"
                              name={`grant:${permission}`}
                              value={scope}
                              defaultChecked={(scopes[permission] ?? "") === scope}
                              className="peer sr-only"
                            />
                            <span
                              className={cn(
                                "inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold whitespace-nowrap text-ink-faint transition-colors hover:text-ink peer-focus-visible:outline-2 peer-focus-visible:outline-accent",
                                scope === ""
                                  ? "peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-card"
                                  : "peer-checked:bg-brand peer-checked:text-brand-ink",
                              )}
                            >
                              {t(`access.${scope || "none"}`)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </fieldset>

      {locked ? null : (
        <div className="sticky bottom-28 z-10 flex justify-end lg:bottom-4">
          <Button type="submit" size="lg" disabled={pending} className="shadow-pop">
            {pending ? tc("saving") : t("save")}
          </Button>
        </div>
      )}
    </form>
  );
}
