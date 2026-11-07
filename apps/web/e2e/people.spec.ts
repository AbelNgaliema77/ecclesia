import { expect, test } from "@playwright/test";
import { ADMIN_STATE, unique } from "./support";

test.use({ storageState: ADMIN_STATE });

test("filters leaders and people without a team and shows their teams", async ({ page }) => {
  await page.goto("/people?filter=leaders");
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toBeVisible();
  await expect(rows.first().getByRole("list", { name: "Teams" })).toBeVisible();
  await page.getByLabel("Show").selectOption("unassigned");
  await page.getByRole("button", { name: "Search people", exact: true }).click();
  await expect(page).toHaveURL(/filter=unassigned/);
  await expect(rows.first().getByRole("list", { name: "Teams" })).toHaveCount(0);
});

test("imports people from a spreadsheet after a preview", async ({ page }) => {
  const tag = unique("import");
  const csv = [
    "First name,Last name,Email,Year joined,Team",
    `Ama,${tag},ama.${tag}@example.test,2015,Media`,
    `Kofi,${tag},,2024,`,
    `Kofi,${tag},,2024,`,
    `Bad,${tag},not-an-email,3000,Nowhere`,
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
  await expect(page.getByText("The year can’t be in the future.")).toBeVisible();
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

test("adds a person straight into a team with the year they joined", async ({ page }) => {
  const last = unique("Joined");
  await page.goto("/people/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("First name").fill("Neo");
  await page.getByLabel("Last name").fill(last);
  await page.getByLabel("Year joined").fill("2019");
  await page.getByLabel("Team").selectOption({ label: "Media" });
  await page.getByRole("button", { name: "Save person" }).click();
  await expect(page.getByRole("heading", { name: `Neo ${last}` })).toBeVisible();
  const teams = page.getByRole("complementary");
  await expect(teams.getByRole("link", { name: "Media" })).toBeVisible();
  await expect(page.getByLabel("Year joined")).toHaveValue("2019");
});
