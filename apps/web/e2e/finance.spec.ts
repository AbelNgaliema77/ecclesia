import { expect, type Page, test } from "@playwright/test";
import { ADMIN_STATE, LEADER_STATE, TREASURER_STATE, totp, unique } from "./support";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const as = async (browser: import("@playwright/test").Browser, storageState: string) => {
  const context = await browser.newContext({ storageState });
  return { context, page: await context.newPage() };
};

const pickPerson = async (page: Page, label: string, query: string) => {
  const box = page.getByRole("combobox", { name: label });
  await box.fill(query);
  await page.getByRole("listbox", { name: label }).getByRole("option").first().click();
};

test("a cash count needs a second person to verify it", async ({ browser }) => {
  const treasurer = await as(browser, TREASURER_STATE);
  await treasurer.page.goto("/finance/counts");
  await treasurer.page.waitForLoadState("networkidle");
  await treasurer.page.getByRole("button", { name: "New count" }).click();
  await treasurer.page.getByRole("dialog").getByRole("button", { name: "Start counting" }).click();
  await expect(treasurer.page).toHaveURL(/\/finance\/counts\/[0-9a-f-]{36}$/);
  const countUrl = treasurer.page.url();

  await treasurer.page.getByLabel("Amount for line 1").fill("1500");
  await treasurer.page.getByRole("button", { name: "Add envelope" }).click();
  await pickPerson(treasurer.page, "Envelope giver for line 2", "ENV-001");
  await treasurer.page.getByLabel("Amount for line 2").fill("250,50");
  await expect(treasurer.page.getByText("R 1,750.50").last()).toBeVisible();
  await treasurer.page.getByRole("button", { name: "Submit for verification" }).click();
  await expect(treasurer.page.getByText("You submitted this count")).toBeVisible();
  await expect(treasurer.page.getByRole("button", { name: "Verify count" })).toHaveCount(0);

  const admin = await as(browser, ADMIN_STATE);
  await admin.page.goto(countUrl);
  await admin.page.getByRole("button", { name: "Verify count" }).click();
  await admin.page.getByRole("dialog").getByRole("button", { name: "Verify count" }).click();
  await expect(admin.page.getByRole("heading", { name: "Verified by two people" })).toBeVisible();
  await treasurer.context.close();
  await admin.context.close();
});

test("a payment request carries its receipt through approval and payment", async ({ browser }) => {
  const title = unique("Cables");
  const leader = await as(browser, LEADER_STATE);
  await leader.page.goto("/finance/expenses/new");
  await leader.page.waitForLoadState("networkidle");
  await leader.page.getByLabel("What is it for?").fill(title);
  await leader.page.getByLabel("Amount").fill("450");
  await leader.page.getByLabel("Pay to").fill("Music shop");
  await leader.page.getByLabel("Category").selectOption({ index: 1 });
  await leader.page.getByLabel("Receipt").check();
  await leader.page.locator('input[type="file"][multiple]').setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(leader.page.getByRole("img", { name: "receipt.png" })).toBeVisible();
  await leader.page.getByRole("button", { name: "Submit request" }).click();
  await expect(leader.page).toHaveURL(/\/finance\/expenses\/[0-9a-f-]{36}$/);
  await expect(leader.page.getByRole("heading", { name: title })).toBeVisible();
  await expect(leader.page.getByRole("img", { name: "receipt.png" })).toBeVisible();
  const url = leader.page.url();
  const image = await leader.page
    .getByRole("link")
    .filter({ has: leader.page.getByRole("img", { name: "receipt.png" }) })
    .getAttribute("href");
  const file = await leader.page.request.get(image ?? "");
  expect(file.headers()["content-type"]).toBe("image/png");

  const treasurer = await as(browser, TREASURER_STATE);
  await treasurer.page.goto(url);
  await treasurer.page.getByRole("button", { name: "Approve" }).click();
  await treasurer.page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(treasurer.page.getByText("Approved", { exact: true }).first()).toBeVisible();

  const admin = await as(browser, ADMIN_STATE);
  await admin.page.goto(url);
  await admin.page.getByRole("button", { name: "Mark as paid" }).click();
  const dialog = admin.page.getByRole("dialog");
  await dialog.getByLabel("Payment reference").fill("EFT-12345");
  await dialog.getByRole("button", { name: "Mark as paid" }).click();
  await expect(admin.page.getByText("Reference EFT-12345")).toBeVisible();
  for (const session of [leader, treasurer, admin]) await session.context.close();
});

test("a bank statement records matched EFTs once", async ({ browser }) => {
  const admin = await as(browser, ADMIN_STATE);
  const reference = unique("E2E");
  const today = new Date().toISOString().slice(0, 10);
  const csv = [
    "Account statement,,",
    "Date,Description,Amount",
    `${today},ENV-002 ${reference},777.77`,
    `${today},BANK FEES ${reference},-35.00`,
  ].join("\n");
  const upload = () =>
    admin.page
      .locator('input[type="file"]')
      .setInputFiles({ name: "statement.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await admin.page.goto("/finance/bank");
  await admin.page.waitForLoadState("networkidle");
  await upload();
  await expect(admin.page.getByText("1 new payment")).toBeVisible();
  await expect(admin.page.getByText("matched ENV-002")).toBeVisible();
  await admin.page.getByRole("button", { name: "Record 1 payment" }).click();
  await expect(admin.page.getByText("1 gift recorded")).toBeVisible();
  await upload();
  await expect(
    admin.page.getByText("Everything in this statement has already been imported."),
  ).toBeVisible();
  await admin.page.goto(`/finance/giving?q=${reference}`);
  await expect(admin.page.locator("tbody tr")).toHaveCount(1);
  await admin.context.close();
});

test("issued Section 18A certificates can be printed", async ({ browser }) => {
  const admin = await as(browser, ADMIN_STATE);
  await admin.page.goto("/finance/certificates");
  await admin.page.waitForLoadState("networkidle");
  const issueAll = admin.page.getByRole("button", { name: /^Issue \d+ certificates?$/ });
  if (await issueAll.count()) {
    await issueAll.click();
    await expect(issueAll).toHaveCount(0);
  }
  await admin.page.getByRole("link", { name: "View", exact: true }).first().click();
  await expect(admin.page).toHaveURL(/\/print\/certificates\//, { timeout: 30_000 });
  await expect(admin.page.getByRole("heading", { name: "Section 18A receipt" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(admin.page.getByText(/^18A-\d{4}-\d{4}$/)).toBeVisible();
  await admin.context.close();
});

test("finance stays locked until two-step verification is on", async ({ page }) => {
  const email = `${unique("treasurer")}@example.test`;
  const password = "finance-password-123";
  await page.goto("/sign-up");
  await page.getByLabel("Full name").fill("New Treasurer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel("Church name").fill("Two Step Church");
  await page.getByLabel("Short name").fill(unique("two-step"));
  await page.getByRole("button", { name: "Create church" }).click();
  await expect(page).not.toHaveURL(/onboarding/);

  await page.goto("/finance");
  await expect(
    page.getByRole("heading", { name: "Turn on two-step verification to open Finance" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Giving" })).toHaveCount(0);
  await page.getByRole("link", { name: "Set it up" }).click();
  await page.getByLabel("Your password").fill(password);
  await page.getByRole("button", { name: "Turn on" }).click();
  const secret = (await page.getByTestId("totp-secret").textContent()) ?? "";
  await page.getByLabel("6-digit code").fill(totp(secret));
  await page.getByRole("button", { name: "Confirm and turn on" }).click();
  await expect(page.getByTestId("backup-codes").locator("li")).toHaveCount(10);
  await page.getByRole("button", { name: "I’ve saved them" }).click();

  await page.goto("/finance");
  await expect(page.getByRole("heading", { name: "Income and expenses" })).toBeVisible();

  await page.context().clearCookies();
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await expect(async () => {
    if (new URL(page.url()).pathname.startsWith("/sign-in")) {
      await page.getByRole("button", { name: "Sign in" }).click();
    }
    await expect(page).toHaveURL(/two-factor/, { timeout: 5_000 });
  }).toPass({ intervals: [3_000], timeout: 40_000 });
  await page.getByLabel("Code from your app").fill(totp(secret, Date.now() + 30_000));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).not.toHaveURL(/two-factor|sign-in/);
});
