import { expect, test } from "@playwright/test";
import { ADMIN, latestEmailTo, linkIn, unique } from "./support";

test("shows a clear error for a wrong password", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await expect(async () => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("That email and password don't match")).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ intervals: [4_000], timeout: 40_000 });
});

test("resets a forgotten password through the emailed link", async ({ page }) => {
  const email = `${unique("reset")}@example.test`;
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("Reset Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("first-password-123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.context().clearCookies();

  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Forgot password?" })).toHaveAttribute(
    "href",
    "/forgot-password",
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("reset link is on its way");

  const message = await latestEmailTo(email);
  expect(message.subject).toBe("Reset your Ecclesia password");
  await page.goto(linkIn(message.text, /http:\/\/localhost:3100\/api\/auth\/reset-password\/\S+/));
  await expect(page).toHaveURL(/reset-password\?token=/);
  await page.getByLabel("New password", { exact: true }).fill("second-password-456");
  await page.getByLabel("Confirm new password").fill("second-password-456");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("status")).toContainText("password has been changed");

  await page.getByRole("link", { name: "Sign in" }).click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("second-password-456");
  await expect(async () => {
    if (new URL(page.url()).pathname.startsWith("/sign-in")) {
      await page.getByRole("button", { name: "Sign in" }).click();
    }
    await expect(page).toHaveURL(/onboarding/, { timeout: 5_000 });
  }).toPass({ intervals: [3_000], timeout: 40_000 });
});
