import type { DeliveryResult, EmailMessage, Mailer } from "./types";

type Fetch = typeof fetch;

export const resendMailer = (apiKey: string, from: string, fetcher: Fetch = fetch): Mailer => ({
  async send(message: EmailMessage): Promise<DeliveryResult> {
    try {
      const response = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          tags: [{ name: "kind", value: message.kind }],
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return { status: "sent" };
      console.error("Email provider rejected message", response.status, await response.text());
      return { status: "failed" };
    } catch (error) {
      console.error("Email provider unreachable", error);
      return { status: "failed" };
    }
  },
});
