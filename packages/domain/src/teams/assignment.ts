import { rangesOverlap } from "../shared/dates";
import { domainError, err, ok, type Result } from "../shared/result";

export type AssignmentPeriod = {
  readonly personId: string;
  readonly positionId: string;
  readonly startsOn: Date;
  readonly endsOn: Date | null;
};

export type PositionCapacity = {
  readonly positionId: string;
  readonly maxHolders: number | null;
};

const activeOn = (assignment: AssignmentPeriod, day: Date): boolean =>
  assignment.startsOn.getTime() <= day.getTime() &&
  (assignment.endsOn === null || assignment.endsOn.getTime() >= day.getTime());

export const validateAssignment = (
  candidate: AssignmentPeriod,
  existing: readonly AssignmentPeriod[],
  capacity: PositionCapacity,
): Result<AssignmentPeriod> => {
  if (candidate.endsOn !== null && candidate.endsOn.getTime() < candidate.startsOn.getTime()) {
    return err(domainError("assignment.endBeforeStart", "End date is before start date"));
  }

  const samePosition = existing.filter((a) => a.positionId === candidate.positionId);

  const duplicate = samePosition.some(
    (a) =>
      a.personId === candidate.personId &&
      rangesOverlap(
        { start: a.startsOn, end: a.endsOn },
        { start: candidate.startsOn, end: candidate.endsOn },
      ),
  );
  if (duplicate) {
    return err(
      domainError(
        "assignment.alreadyHeld",
        "This person already holds this position for that period",
      ),
    );
  }

  if (capacity.maxHolders !== null) {
    const holders = samePosition.filter((a) => activeOn(a, candidate.startsOn)).length;
    if (holders >= capacity.maxHolders) {
      return err(
        domainError("assignment.positionFull", "This position is already filled", {
          maxHolders: capacity.maxHolders,
        }),
      );
    }
  }

  return ok(candidate);
};

export const endAssignmentOn = (
  assignment: { readonly startsOn: Date; readonly endsOn: Date | null },
  endsOn: Date,
): Result<Date> => {
  if (assignment.endsOn !== null)
    return err(domainError("assignment.alreadyEnded", "Already ended"));
  if (endsOn.getTime() < assignment.startsOn.getTime()) {
    return err(domainError("assignment.endBeforeStart", "End date is before start date"));
  }
  return ok(endsOn);
};
