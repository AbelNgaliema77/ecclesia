import "server-only";
import {
  account,
  session,
  twoFactor as twoFactorTable,
  user,
  verification,
} from "@ecclesia/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { isLocale } from "@/i18n/config";
import { db } from "./db";
import { sendEmail } from "./email";
import { passwordResetEmail } from "./email/templates";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, twoFactor: twoFactorTable },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const locale = "locale" in user && isLocale(user.locale) ? user.locale : "en";
      const message = passwordResetEmail({ locale, name: user.name, url });
      void sendEmail({ ...message, to: user.email, kind: "passwordReset" });
    },
  },
  user: {
    additionalFields: {
      locale: { type: "string", defaultValue: "en", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production",
  },
  plugins: [
    twoFactor({
      issuer: "Ecclesia",
      backupCodeOptions: { amount: 10, length: 10 },
    }),
    nextCookies(),
  ],
});
