import { emailMode } from "@/server/email";
import { readOutboxEntry } from "@/server/email/outbox";
import { env } from "@/server/env";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (emailMode !== "outbox") return new Response(null, { status: 404 });
  const entry = await readOutboxEntry(env.ECCLESIA_OUTBOX_DIR, (await params).id);
  if (!entry) return new Response(null, { status: 404 });
  return new Response(entry.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:",
      "Cache-Control": "no-store",
    },
  });
}
