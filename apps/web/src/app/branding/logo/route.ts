import { withChurch } from "@ecclesia/db";
import { settings } from "@ecclesia/db/repositories";
import { getChurchContext } from "@/server/context";
import { db } from "@/server/db";

export async function GET(request: Request) {
  const context = await getChurchContext();
  const logo = await withChurch(db, context.membership.churchId, (tx) => settings.getLogo(tx));
  if (!logo) return new Response(null, { status: 404 });
  const versioned = new URL(request.url).searchParams.has("v");
  return new Response(Buffer.from(logo.data), {
    headers: {
      "Content-Type": logo.contentType,
      "Content-Length": String(logo.data.byteLength),
      "Cache-Control": versioned ? "private, max-age=31536000, immutable" : "private, no-cache",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Last-Modified": logo.updatedAt.toUTCString(),
    },
  });
}
