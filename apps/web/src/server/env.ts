import "server-only";
import { z } from "zod";

const optionalText = (min: number) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().min(min).optional());

const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ECCLESIA_SHOW_DEMO_LOGIN: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  RESEND_API_KEY: optionalText(1),
  EMAIL_FROM: optionalText(3),
  ECCLESIA_OUTBOX_DIR: z.string().min(1).default(".outbox"),
  ECCLESIA_EMAIL_OUTBOX: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = schema
  .refine((value) => !value.RESEND_API_KEY || value.EMAIL_FROM, {
    message: "EMAIL_FROM is required when RESEND_API_KEY is set",
    path: ["EMAIL_FROM"],
  })
  .parse(process.env);
