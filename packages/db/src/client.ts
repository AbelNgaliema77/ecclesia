import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DatabaseOptions = {
  readonly maxConnections?: number;
};

export const createDatabase = (url: string, options: DatabaseOptions = {}) => {
  const client = postgres(url, { max: options.maxConnections ?? 10, onnotice: () => {} });
  return drizzle({ client, schema, casing: "snake_case" });
};

export type Database = ReturnType<typeof createDatabase>;

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type Executor = Database | Tx;

export const currentChurchId = sql<string>`app_current_church_id()`;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const withChurch = async <T>(
  db: Database,
  churchId: string,
  work: (tx: Tx) => Promise<T>,
): Promise<T> => {
  if (!UUID_PATTERN.test(churchId)) throw new Error("Invalid church id");
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.church_id', ${churchId}, true)`);
    return work(tx);
  });
};

export const ping = async (db: Database): Promise<void> => {
  await db.execute(sql`select 1`);
};
