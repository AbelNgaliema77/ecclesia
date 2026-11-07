"use client";

import { ArrowLeftRight, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  AssignDialog,
  DeletePositionDialog,
  DeleteTeamDialog,
  EndAssignmentDialog,
  HandOverDialog,
  PositionDialog,
  TeamDialog,
} from "./team-dialogs";

type Localized = { en: string; fr: string };

export function CreateTeamButton({ usedColors }: { usedColors: readonly string[] }) {
  const t = useTranslations("teams");
  return (
    <TeamDialog
      usedColors={usedColors}
      trigger={(open) => (
        <Button onClick={open}>
          <Plus aria-hidden className="size-4" />
          {t("create")}
        </Button>
      )}
    />
  );
}

export function TeamHeaderActions({
  team,
  canDelete,
}: {
  team: {
    id: string;
    name: Localized;
    displayName: string;
    description: string | null;
    color: string | null;
  };
  canDelete: boolean;
}) {
  const t = useTranslations("teams");
  return (
    <div className="flex gap-2">
      <TeamDialog
        initial={team}
        trigger={(open) => (
          <Button variant="secondary" onClick={open}>
            <Pencil aria-hidden className="size-4" />
            {t("editTeam")}
          </Button>
        )}
      />
      {canDelete ? (
        <DeleteTeamDialog
          id={team.id}
          name={team.displayName}
          trigger={(open) => (
            <Button variant="secondary" onClick={open} aria-label={t("deleteTeam")}>
              <Trash2 aria-hidden className="size-4 text-danger" />
            </Button>
          )}
        />
      ) : null}
    </div>
  );
}

export function AddPositionButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const t = useTranslations("teams");
  return (
    <PositionDialog
      teamId={teamId}
      teamName={teamName}
      trigger={(open) => (
        <Button variant="soft" onClick={open}>
          <Plus aria-hidden className="size-4" />
          {t("addPosition")}
        </Button>
      )}
    />
  );
}

export function PositionActions({
  teamId,
  teamName,
  position,
  displayName,
  canDelete,
  people,
  holders,
  full,
}: {
  teamId: string;
  teamName: string;
  position: { id: string; name: Localized; isLeadership: boolean; maxHolders: number | null };
  displayName: string;
  canDelete: boolean;
  people: readonly { id: string; label: string }[];
  holders: readonly { assignmentId: string; personId: string; name: string }[];
  full: boolean;
}) {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const holderIds = holders.map((h) => h.personId);
  return (
    <div className="flex items-center gap-1">
      {holders.length > 0 && (full || position.isLeadership) ? (
        <HandOverDialog
          positionId={position.id}
          positionName={displayName}
          holders={holders}
          people={people}
          trigger={(open) => (
            <Button variant="soft" size="sm" onClick={open}>
              <ArrowLeftRight aria-hidden className="size-4" />
              {t("handOver")}
            </Button>
          )}
        />
      ) : null}
      {full ? null : (
        <AssignDialog
          positionId={position.id}
          positionName={displayName}
          people={people}
          excludeIds={holderIds}
          trigger={(open) => (
            <Button variant="soft" size="sm" onClick={open}>
              <UserPlus aria-hidden className="size-4" />
              {t("assign")}
            </Button>
          )}
        />
      )}
      <PositionDialog
        teamId={teamId}
        teamName={teamName}
        initial={position}
        trigger={(open) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={open}
            aria-label={t("editPositionTitle", { name: displayName })}
          >
            <Pencil aria-hidden className="size-4" />
            <span className="sr-only">{tc("edit")}</span>
          </Button>
        )}
      />
      {canDelete ? (
        <DeletePositionDialog
          id={position.id}
          name={displayName}
          trigger={(open) => (
            <Button
              variant="ghost"
              size="sm"
              onClick={open}
              aria-label={t("deletePositionTitle", { name: displayName })}
            >
              <Trash2 aria-hidden className="size-4 text-danger" />
            </Button>
          )}
        />
      ) : null}
    </div>
  );
}

export function EndAssignmentButton({
  assignmentId,
  personName,
  positionName,
}: {
  assignmentId: string;
  personName: string;
  positionName: string;
}) {
  const t = useTranslations("teams");
  return (
    <EndAssignmentDialog
      assignmentId={assignmentId}
      personName={personName}
      positionName={positionName}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          aria-label={t("endTitle", { name: personName, position: positionName })}
          className="inline-flex size-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    />
  );
}
