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

const DAY_MS = 86_400_000;

export type StopServing =
  | { readonly kind: "end"; readonly endsOn: Date }
  | { readonly kind: "remove" };

export const stopServing = (
  assignment: { readonly startsOn: Date; readonly endsOn: Date | null },
  from: Date,
): Result<StopServing> => {
  if (assignment.endsOn !== null && assignment.endsOn.getTime() < from.getTime()) {
    return err(domainError("assignment.alreadyEnded", "Already ended"));
  }
  if (from.getTime() <= assignment.startsOn.getTime()) return ok({ kind: "remove" });
  return ok({ kind: "end", endsOn: new Date(from.getTime() - DAY_MS) });
};

export const handOver = (
  outgoing: AssignmentPeriod,
  incomingPersonId: string,
  from: Date,
  existing: readonly AssignmentPeriod[],
  capacity: PositionCapacity,
): Result<{ readonly stop: StopServing; readonly incoming: AssignmentPeriod }> => {
  if (outgoing.personId === incomingPersonId) {
    return err(domainError("assignment.samePerson", "Choose someone else to take over"));
  }
  const stop = stopServing(outgoing, from);
  if (!stop.ok) return stop;
  const remaining = existing.flatMap((period) => {
    if (period !== outgoing) return [period];
    return stop.value.kind === "remove" ? [] : [{ ...period, endsOn: stop.value.endsOn }];
  });
  const incoming = validateAssignment(
    { personId: incomingPersonId, positionId: outgoing.positionId, startsOn: from, endsOn: null },
    remaining,
    capacity,
  );
  return incoming.ok ? ok({ stop: stop.value, incoming: incoming.value }) : incoming;
};
