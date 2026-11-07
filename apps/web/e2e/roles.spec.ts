import { expect, test } from "@playwright/test";
import { LEADER_STATE } from "./support";

test.use({ storageState: LEADER_STATE });

test("a team leader sees people and their own teams only", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main navigation" }).first();
  await expect(nav.getByRole("link", { name: "People" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Teams" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Attendance" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Your teams" })).toBeVisible();

  await page.goto("/people?filter=unassigned");
  await page.locator("tbody tr a").first().click();
  await expect(page.getByRole("button", { name: "Delete person" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save person" })).toHaveCount(0);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.goto("/people/import");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
