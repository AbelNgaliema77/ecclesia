import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Ecclesia-Demo-2026";
export const ADMIN = { email: "demo@ecclesia.app", password: DEMO_PASSWORD };
export const LEADER = { email: "leader@ecclesia.app", password: DEMO_PASSWORD };
export const ADMIN_STATE = "test-results/.auth/admin.json";
export const LEADER_STATE = "test-results/.auth/leader.json";

export const signIn = async (page: Page, account: { email: string; password: string }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL((url) => !url.pathname.startsWith("/sign-in"));
};

const outboxDir = path.resolve(process.env.ECCLESIA_OUTBOX_DIR ?? ".outbox");

type OutboxEntry = { to: string; subject: string; text: string; createdAt: string };

export const latestEmailTo = async (to: string): Promise<OutboxEntry> => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const files = await readdir(outboxDir).catch(() => [] as string[]);
    const entries = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(
          async (file) =>
            JSON.parse(await readFile(path.join(outboxDir, file), "utf8")) as OutboxEntry,
        ),
    );
    const match = entries
      .filter((entry) => entry.to === to)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No email to ${to} in ${outboxDir}`);
};

export const linkIn = (text: string, pattern: RegExp) => {
  const match = text.match(pattern);
  if (!match) throw new Error(`No link matching ${pattern}`);
  return match[0];
};

export const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;
