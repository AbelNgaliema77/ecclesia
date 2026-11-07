import { withChurch } from "@ecclesia/db";
import { expenses } from "@ecclesia/db/repositories";
import { broadestScope, can } from "@ecclesia/domain/access";
import { getChurchContext } from "@/server/context";
import { db } from "@/server/db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const { id, fileId } = await params;
  if (!UUID.test(id) || !UUID.test(fileId)) return new Response(null, { status: 404 });
  const context = await getChurchContext();
  const { actor, user } = context;
  if (!can(actor, "payments.request") && !can(actor, "payments.approve")) {
    return new Response(null, { status: 404 });
  }
  const file = await withChurch(db, context.membership.churchId, async (tx) => {
    const expense = await expenses.getExpense(tx, id);
    if (!expense) return null;
    const visible =
      can(actor, "payments.approve") ||
      broadestScope(actor.grants, "payments.request") === "church" ||
      expense.requestedBy === user.id ||
      (expense.teamId !== null && actor.ledTeamIds.includes(expense.teamId));
    if (!visible) return null;
    const attachment = await expenses.getAttachment(tx, fileId);
    return attachment?.requestId === id ? attachment : null;
  });
  if (!file) return new Response(null, { status: 404 });
  const download = new URL(request.url).searchParams.has("download");
  return new Response(Buffer.from(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.byteSize),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${file.fileName}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
