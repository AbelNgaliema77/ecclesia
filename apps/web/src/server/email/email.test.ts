import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listOutbox, outboxMailer, readOutboxEntry } from "./outbox";
import { resendMailer } from "./resend";
import { invitationEmail, passwordResetEmail } from "./templates";
import type { EmailMessage } from "./types";

const message: EmailMessage = {
  to: "ama@example.org",
  subject: "Hello",
  html: "<p>Hello</p>",
  text: "Hello",
  kind: "invitation",
};

describe("resendMailer", () => {
  it("posts the message and reports success", async () => {
    const fetcher = vi.fn(async () => new Response("{}", { status: 200 }));
    const result = await resendMailer("key", "Ecclesia <hello@example.org>", fetcher).send(message);
    expect(result.status).toBe("sent");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ Authorization: "Bearer key" });
    expect(JSON.parse(String(init.body))).toMatchObject({
      to: ["ama@example.org"],
      subject: "Hello",
    });
  });

  it("reports failure without throwing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const rejected = resendMailer("key", "from", async () => new Response("no", { status: 422 }));
    expect((await rejected.send(message)).status).toBe("failed");
    const offline = resendMailer("key", "from", async () => {
      throw new Error("offline");
    });
    expect((await offline.send(message)).status).toBe("failed");
    error.mockRestore();
  });
});

describe("outboxMailer", () => {
  let directory = "";
  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it("stores messages newest first and refuses unsafe ids", async () => {
    directory = await mkdtemp(path.join(tmpdir(), "outbox-"));
    const mailer = outboxMailer(directory);
    await mailer.send(message);
    await new Promise((resolve) => setTimeout(resolve, 2));
    await mailer.send({ ...message, subject: "Second" });
    const entries = await listOutbox(directory);
    expect(entries.map((e) => e.subject)).toEqual(["Second", "Hello"]);
    expect(await readOutboxEntry(directory, entries[0]?.id ?? "")).toMatchObject({
      subject: "Second",
    });
    expect(await readOutboxEntry(directory, "../../etc/passwd")).toBeNull();
  });
});

describe("templates", () => {
  it("escapes values and localises the invitation", () => {
    const email = invitationEmail({
      locale: "fr",
      churchName: "La <Borne>",
      inviterName: "Abel",
      roleName: "Chef d'équipe",
      link: "https://app.example.org/invite/abc",
      expiresAt: new Date("2026-11-13T22:30:00Z"),
      timeZone: "Africa/Johannesburg",
    });
    expect(email.subject).toBe("Abel vous invite à rejoindre La <Borne> sur Ecclesia");
    expect(email.html).toContain("La &lt;Borne&gt;");
    expect(email.html).not.toContain("La <Borne>");
    expect(email.text).toContain("https://app.example.org/invite/abc");
    expect(email.text).toContain("14 novembre 2026");
  });

  it("builds the password reset email", () => {
    const email = passwordResetEmail({ locale: "en", name: "Ama", url: "https://x.test/r" });
    expect(email.subject).toBe("Reset your Ecclesia password");
    expect(email.html).toContain('href="https://x.test/r"');
  });
});
