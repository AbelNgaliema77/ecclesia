import { expect, test } from "@playwright/test";
import { ADMIN_STATE, unique } from "./support";

test.use({ storageState: ADMIN_STATE });

test("filters workers and leaders and shows their teams", async ({ page }) => {
  await page.goto("/people?filter=leaders");
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first().getByRole("list", { name: "Teams" })).toBeVisible();
  await page.getByLabel("Show").selectOption("visitor");
  await page.getByRole("button", { name: "Search people", exact: true }).click();
  await expect(page).toHaveURL(/filter=visitor/);
});

test("imports people from a spreadsheet after a preview", async ({ page }) => {
  const tag = unique("import");
  const csv = [
    "First name,Last name,Email,Status,Team",
    `Ama,${tag},ama.${tag}@example.test,Member,Media`,
    `Kofi,${tag},,Visitor,`,
    `Kofi,${tag},,Visitor,`,
    `Bad,${tag},not-an-email,Elder,Nowhere`,
  ].join("\n");
  await page.goto("/people/import");
  await page.waitForLoadState("networkidle");
  await page.locator('input[type="file"]').setInputFiles({
    name: "people.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await expect(page.getByText("2 ready")).toBeVisible();
  await expect(page.getByText("1 already here")).toBeVisible();
  await expect(page.getByText("1 needs fixing")).toBeVisible();
  await expect(page.getByText("Use Visitor, Regular, Member or Inactive.")).toBeVisible();
  await page.getByRole("button", { name: "Import 2 people" }).click();
  await expect(page).toHaveURL(/\/people$/);
  await page.getByRole("searchbox", { name: "Search people" }).fill(tag);
  await page.getByRole("button", { name: "Search people", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
});

test("deletes a person after confirming", async ({ page }) => {
  const last = unique("Delete");
  await page.goto("/people/new");
  await page.getByLabel("First name").fill("Temp");
  await page.getByLabel("Last name").fill(last);
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page.getByRole("heading", { name: `Temp ${last}` })).toBeVisible();
  await page.getByRole("button", { name: "Delete person" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete person" }).click();
  await expect(page).toHaveURL(/\/people$/);
  await page.getByRole("searchbox", { name: "Search people" }).fill(last);
  await page.getByRole("button", { name: "Search people", exact: true }).click();
  await expect(page.getByText("No one matches that search")).toBeVisible();
});
