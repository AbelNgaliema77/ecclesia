import postgres from "postgres";
import { requireEnv } from "./env";

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to reset a production database");
}

const sql = postgres(requireEnv("DATABASE_OWNER_URL"), { max: 1, onnotice: () => {} });

await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
await sql`DROP SCHEMA public CASCADE`;
await sql`CREATE SCHEMA public`;
await sql.end();
console.log("Database reset");
