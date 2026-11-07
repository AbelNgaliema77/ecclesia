"use client";

import { nextPresetColor } from "@ecclesia/domain/shared";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LocalizedNameFields } from "@/components/forms/localized-name-fields";
import { ActionDialog } from "@/components/ui/action-dialog";
import { ColorPicker } from "@/components/ui/color-picker";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import {
  assignPersonAction,
  deletePositionAction,
  deleteTeamAction,
  endAssignmentAction,
  handOverAction,
  savePositionAction,
  saveTeamAction,
} from "./actions";

type Trigger = (open: () => void) => ReactNode;
type Localized = { en: string; fr: string };

const today = () => new Date().toISOString().slice(0, 10);

export function TeamDialog({
  trigger,
  initial,
  usedColors = [],
}: {
  trigger: Trigger;
  initial?: { id: string; name: Localized; description: string | null; color: string | null };
  usedColors?: readonly string[];
}) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  return (
    <ActionDialog
      action={saveTeamAction}
      hidden={initial ? { id: initial.id } : {}}
      trigger={trigger}
      title={initial ? t("editTitle", { name: initial.name.en }) : t("createTitle")}
      submitLabel={t("save")}
      successMessage={t("saved")}
    >
      {({ fieldError }) => (
        <>
          <LocalizedNameFields
            name="name"
            labels={{ en: t("nameEn"), fr: t("nameFr"), optional: tc("optional") }}
            {...(initial ? { defaultValue: initial.name } : {})}
            error={fieldError("name.en")}
          />
          <Field id="team-description" label={t("description")} optionalLabel={tc("optional")}>
            <Textarea
              id="team-description"
              name="description"
              maxLength={280}
              defaultValue={initial?.description ?? ""}
            />
          </Field>
          <ColorPicker
            name="color"
            label={t("color")}
            defaultValue={initial?.color ?? nextPresetColor(usedColors)}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function DeleteTeamDialog({
  trigger,
  id,
  name,
}: {
  trigger: Trigger;
  id: string;
  name: string;
}) {
  const t = useTranslations("teams");
  return (
    <ConfirmAction
      action={deleteTeamAction}
      hidden={{ id }}
      trigger={trigger}
      title={t("deleteTitle", { name })}
      description={t("deleteLead")}
      confirmLabel={t("deleteTeam")}
      successMessage={t("deleted")}
    />
  );
}

export function PositionDialog({
  trigger,
  teamId,
  teamName,
  initial,
}: {
  trigger: Trigger;
  teamId: string;
  teamName: string;
  initial?: { id: string; name: Localized; isLeadership: boolean; maxHolders: number | null };
}) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  return (
    <ActionDialog
      action={savePositionAction}
      hidden={{ teamId, ...(initial ? { id: initial.id } : {}) }}
      trigger={trigger}
      title={
        initial
          ? t("editPositionTitle", { name: initial.name.en })
          : t("positionTitle", { team: teamName })
      }
      submitLabel={t("savePosition")}
      successMessage={t("positionSaved")}
    >
      {({ fieldError, invalid }) => (
        <>
          <LocalizedNameFields
            name="name"
            labels={{ en: t("nameEn"), fr: t("nameFr"), optional: tc("optional") }}
            {...(initial ? { defaultValue: initial.name } : {})}
            error={fieldError("name.en")}
          />
          <Field
            id="position-max"
            label={t("maxHolders")}
            hint={t("maxHint")}
            error={fieldError("maxHolders")}
          >
            <Input
              id="position-max"
              name="maxHolders"
              type="number"
              min={1}
              max={500}
              inputMode="numeric"
              defaultValue={initial?.maxHolders ?? ""}
              aria-invalid={invalid("maxHolders")}
              className="sm:w-40"
            />
          </Field>
          <Switch
            name="isLeadership"
            label={t("leadership")}
            hint={t("leadershipHint")}
            defaultChecked={initial?.isLeadership ?? false}
          />
        </>
      )}
    </ActionDialog>
  );
}

export function DeletePositionDialog({
  trigger,
  id,
  name,
}: {
  trigger: Trigger;
  id: string;
  name: string;
}) {
  const t = useTranslations("teams");
  return (
    <ConfirmAction
      action={deletePositionAction}
      hidden={{ id }}
      trigger={trigger}
      title={t("deletePositionTitle", { name })}
      description={t("deletePositionLead")}
      confirmLabel={t("deletePosition")}
      successMessage={t("positionDeleted")}
    />
  );
}

export function AssignDialog({
  trigger,
  positionId,
  positionName,
  people,
  excludeIds,
}: {
  trigger: Trigger;
  positionId: string;
  positionName: string;
  people: readonly { id: string; label: string }[];
  excludeIds: readonly string[];
}) {
  const t = useTranslations("teams");
  const available = people.filter((p) => !excludeIds.includes(p.id));
  return (
    <ActionDialog
      action={assignPersonAction}
      hidden={{ positionId }}
      trigger={trigger}
      title={t("assignTitle", { position: positionName })}
      submitLabel={t("saveAssign")}
      successMessage={t("assigned")}
    >
      {({ fieldError }) => (
        <>
          <Field
            id={`assign-person-${positionId}`}
            label={t("person")}
            error={fieldError("personId")}
          >
            <Select id={`assign-person-${positionId}`} name="personId" required defaultValue="">
              <option value="" disabled>
                {t("choosePerson")}
              </option>
              {available.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id={`assign-start-${positionId}`}
            label={t("startsOn")}
            error={fieldError("startsOn")}
          >
            <Input
              id={`assign-start-${positionId}`}
              name="startsOn"
              type="date"
              required
              defaultValue={today()}
              className="sm:w-48"
            />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export function EndAssignmentDialog({
  trigger,
  assignmentId,
  personName,
  positionName,
}: {
  trigger: Trigger;
  assignmentId: string;
  personName: string;
  positionName: string;
}) {
  const t = useTranslations("teams");
  return (
    <ActionDialog
      action={endAssignmentAction}
      hidden={{ assignmentId }}
      trigger={trigger}
      title={t("endTitle", { name: personName, position: positionName })}
      description={t("endLead")}
      submitLabel={t("saveEnd")}
      submitVariant="danger"
      successMessage={t("ended")}
    >
      {({ fieldError }) => (
        <Field id={`end-${assignmentId}`} label={t("stopsFrom")} error={fieldError("from")}>
          <Input
            id={`end-${assignmentId}`}
            name="from"
            type="date"
            required
            defaultValue={today()}
            className="sm:w-48"
          />
        </Field>
      )}
    </ActionDialog>
  );
}

export function HandOverDialog({
  trigger,
  positionId,
  positionName,
  holders,
  people,
}: {
  trigger: Trigger;
  positionId: string;
  positionName: string;
  holders: readonly { assignmentId: string; personId: string; name: string }[];
  people: readonly { id: string; label: string }[];
}) {
  const t = useTranslations("teams");
  const holderIds = holders.map((h) => h.personId);
  const available = people.filter((p) => !holderIds.includes(p.id));
  const [only] = holders;
  return (
    <ActionDialog
      action={handOverAction}
      hidden={holders.length === 1 && only ? { assignmentId: only.assignmentId } : {}}
      trigger={trigger}
      title={t("handOverTitle", { position: positionName })}
      description={
        holders.length === 1 && only
          ? t("handOverLead", { name: only.name })
          : t("handOverLeadMany")
      }
      submitLabel={t("saveHandOver")}
      successMessage={t("handedOver")}
    >
      {({ fieldError }) => (
        <>
          {holders.length > 1 ? (
            <Field
              id={`handover-out-${positionId}`}
              label={t("steppingDown")}
              error={fieldError("assignmentId")}
            >
              <Select
                id={`handover-out-${positionId}`}
                name="assignmentId"
                required
                defaultValue=""
              >
                <option value="" disabled>
                  {t("choosePerson")}
                </option>
                {holders.map((holder) => (
                  <option key={holder.assignmentId} value={holder.assignmentId}>
                    {holder.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field
            id={`handover-in-${positionId}`}
            label={t("takingOver")}
            error={fieldError("personId")}
          >
            <Select id={`handover-in-${positionId}`} name="personId" required defaultValue="">
              <option value="" disabled>
                {t("choosePerson")}
              </option>
              {available.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id={`handover-from-${positionId}`}
            label={t("handOverFrom")}
            error={fieldError("from")}
          >
            <Input
              id={`handover-from-${positionId}`}
              name="from"
              type="date"
              required
              defaultValue={today()}
              className="sm:w-48"
            />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}
