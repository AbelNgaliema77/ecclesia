import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { emailMode } from "@/server/email";
import { listOutbox } from "@/server/email/outbox";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Email outbox", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OutboxPage() {
  if (emailMode !== "outbox") notFound();
  const [entries, t, format] = await Promise.all([
    listOutbox(env.ECCLESIA_OUTBOX_DIR),
    getTranslations("outbox"),
    getFormatter(),
  ]);
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-[2rem] leading-tight font-bold">{t("title")}</h1>
        <p className="mt-2 text-ink-soft">{t("lead")}</p>
      </header>
      {entries.length === 0 ? (
        <p className="card p-6 text-ink-soft">{t("empty")}</p>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/dev/outbox/${entry.id}`}
                className="flex flex-col gap-1 px-5 py-4 transition-colors hover:bg-muted"
              >
                <span className="font-semibold">{entry.subject}</span>
                <span className="text-sm text-ink-faint">
                  {entry.to} ·{" "}
                  {format.dateTime(new Date(entry.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
