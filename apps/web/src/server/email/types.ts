export type EmailMessage = {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
  readonly kind: "invitation" | "passwordReset";
};

export type DeliveryResult = { readonly status: "sent" | "previewed" | "skipped" | "failed" };

export interface Mailer {
  send(message: EmailMessage): Promise<DeliveryResult>;
}
