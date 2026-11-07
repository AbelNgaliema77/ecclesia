import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DeliveryResult, EmailMessage, Mailer } from "./types";

export type OutboxEntry = EmailMessage & { readonly id: string; readonly createdAt: string };

const ID_PATTERN = /^[0-9]{13}-[0-9a-f-]{36}$/;

export const outboxMailer = (directory: string): Mailer => ({
  async send(message: EmailMessage): Promise<DeliveryResult> {
    const createdAt = new Date();
    const id = `${createdAt.getTime()}-${randomUUID()}`;
    await mkdir(directory, { recursive: true });
    const entry: OutboxEntry = { ...message, id, createdAt: createdAt.toISOString() };
    await writeFile(path.join(directory, `${id}.json`), JSON.stringify(entry), { mode: 0o600 });
    return { status: "previewed" };
  },
});

export const listOutbox = async (directory: string, limit = 50): Promise<OutboxEntry[]> => {
  const files = await readdir(directory).catch(() => [] as string[]);
  const ids = files
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5))
    .filter((id) => ID_PATTERN.test(id))
    .sort()
    .reverse()
    .slice(0, limit);
  return Promise.all(ids.map((id) => readOutboxEntry(directory, id))).then((entries) =>
    entries.filter((entry): entry is OutboxEntry => entry !== null),
  );
};

export const readOutboxEntry = async (
  directory: string,
  id: string,
): Promise<OutboxEntry | null> => {
  if (!ID_PATTERN.test(id)) return null;
  try {
    return JSON.parse(await readFile(path.join(directory, `${id}.json`), "utf8")) as OutboxEntry;
  } catch {
    return null;
  }
};
