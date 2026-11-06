"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Select } from "@/components/ui/field";
import { removeMemberAction, revokeInvitationAction, updateMemberAction } from "./actions";

type Option = { id: string; label: string };

type MemberActionsProps = {
  membershipId: string;
  name: string;
  churchName: string;
  roleId: string;
  personId: string | null;
  isSelf: boolean;
  roles: readonly Option[];
  people: readonly Option[];
};

export function MemberActions(props: MemberActionsProps) {
  const t = useTranslations("settings.members");
  return (
    <div className="flex items-center gap-1">
      <ActionDialog
        action={updateMemberAction}
        hidden={{ id: props.membershipId }}
        title={t("editTitle", { name: props.name })}
        submitLabel={t("save")}
        successMessage={t("saved")}
        trigger={(open) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={open}
            aria-label={t("editTitle", { name: props.name })}
          >
            <Pencil aria-hidden className="size-4" />
            <span className="hidden sm:inline">{t("edit")}</span>
          </Button>
        )}
      >
        {({ fieldError }) => (
          <>
            <Field id={`role-${props.membershipId}`} label={t("role")} error={fieldError("roleId")}>
              <Select
                id={`role-${props.membershipId}`}
                name="roleId"
                defaultValue={props.roleId}
                disabled={props.isSelf}
              >
                {props.roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </Field>
            {props.isSelf ? <input type="hidden" name="roleId" value={props.roleId} /> : null}
            <Field id={`person-${props.membershipId}`} label={t("person")} hint={t("personHint")}>
              <Select
                id={`person-${props.membershipId}`}
                name="personId"
                defaultValue={props.personId ?? ""}
              >
                <option value="">{t("noPerson")}</option>
                {props.people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </ActionDialog>
      {props.isSelf ? null : (
        <ConfirmAction
          action={removeMemberAction}
          hidden={{ id: props.membershipId }}
          title={t("removeTitle", { name: props.name })}
          description={t("removeLead", { church: props.churchName })}
          confirmLabel={t("remove")}
          successMessage={t("removed")}
          trigger={(open) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={open}
              aria-label={t("removeTitle", { name: props.name })}
            >
              <Trash2 aria-hidden className="size-4 text-danger" />
            </Button>
          )}
        />
      )}
    </div>
  );
}

export function RevokeInvitation({ id, email }: { id: string; email: string }) {
  const t = useTranslations("settings.members");
  return (
    <ConfirmAction
      action={revokeInvitationAction}
      hidden={{ id }}
      title={t("revokeTitle", { email })}
      description={t("revokeLead")}
      confirmLabel={t("revoke")}
      successMessage={t("revoked")}
      trigger={(open) => (
        <Button variant="ghost" size="sm" onClick={open}>
          {t("revoke")}
        </Button>
      )}
    />
  );
}
