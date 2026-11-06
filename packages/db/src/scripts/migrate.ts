import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "../client";
import { requireEnv } from "./env";

const db = createDatabase(requireEnv("DATABASE_OWNER_URL"), { maxConnections: 1 });

await migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
await db.$client.end();
console.log("Migrations applied");
