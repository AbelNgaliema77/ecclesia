import { currentChurchId, type Tx } from "../client";
import { auditLog } from "../schema";

export type AuditEntry = {
  readonly actorUserId: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly before?: unknown;
  readonly after?: unknown;
};

export const recordAudit = async (tx: Tx, entry: AuditEntry): Promise<void> => {
  await tx.insert(auditLog).values({
    churchId: currentChurchId,
    actorUserId: entry.actorUserId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    before: entry.before ?? null,
    after: entry.after ?? null,
  });
};
