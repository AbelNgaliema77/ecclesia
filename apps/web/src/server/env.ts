import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ECCLESIA_SHOW_DEMO_LOGIN: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = schema.parse(process.env);
