import "server-only";
import { createDatabase, type Database } from "@ecclesia/db";
import { env } from "./env";

const globalForDb = globalThis as unknown as { ecclesiaDb?: Database };

export const db: Database = globalForDb.ecclesiaDb ?? createDatabase(env.DATABASE_URL);

if (env.NODE_ENV !== "production") globalForDb.ecclesiaDb = db;
