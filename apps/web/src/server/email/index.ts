import "server-only";
import { env } from "../env";
import { outboxMailer } from "./outbox";
import { resendMailer } from "./resend";
import type { DeliveryResult, EmailMessage, Mailer } from "./types";

export type EmailMode = "provider" | "outbox" | "disabled";

export const emailMode: EmailMode = env.ECCLESIA_EMAIL_OUTBOX
  ? "outbox"
  : env.RESEND_API_KEY && env.EMAIL_FROM
    ? "provider"
    : env.NODE_ENV === "production"
      ? "disabled"
      : "outbox";

const disabledMailer: Mailer = {
  async send(message) {
    console.warn(`Email not sent (${message.kind}): no email provider is configured`);
    return { status: "skipped" };
  },
};

const mailer: Mailer =
  emailMode === "provider" && env.RESEND_API_KEY && env.EMAIL_FROM
    ? resendMailer(env.RESEND_API_KEY, env.EMAIL_FROM)
    : emailMode === "outbox"
      ? outboxMailer(env.ECCLESIA_OUTBOX_DIR)
      : disabledMailer;

export const sendEmail = (message: EmailMessage): Promise<DeliveryResult> => mailer.send(message);

export type { DeliveryResult, EmailMessage } from "./types";
