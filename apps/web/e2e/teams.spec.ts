import { expect, type Page, test } from "@playwright/test";
import { ADMIN_STATE, unique } from "./support";

test.use({ storageState: ADMIN_STATE });

const chooseSomeone = async (page: Page, label: string, index: number) => {
  const select = page.getByRole("dialog").getByLabel(label);
  const value = await select.locator("option:not([disabled])").nth(index).getAttribute("value");
  await select.selectOption(value ?? "");
  return (await select.locator(`option[value="${value}"]`).textContent()) ?? "";
};

const asName = (label: string) => label.split(", ").reverse().join(" ");

test("replaces a team lead in one step", async ({ page }) => {
  const team = unique("Hospitality");
  await page.goto("/teams");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Create team" }).click();
  await page.getByRole("dialog").getByLabel("Name in English").fill(team);
  await page.getByRole("dialog").getByRole("button", { name: "Save team" }).click();
  await page.getByRole("link", { name: new RegExp(team) }).click();
  await expect(page.getByRole("heading", { name: team })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Add position" }).click();
  const position = page.getByRole("dialog");
  await position.getByLabel("Name in English").fill("Lead");
  await position.getByLabel("Maximum people").fill("1");
  await position.getByText("Leads the team", { exact: true }).click();
  await position.getByRole("button", { name: "Save position" }).click();
  await expect(page.getByText("Vacant")).toBeVisible();

  await page.getByRole("button", { name: "Assign" }).click();
  const first = asName(await chooseSomeone(page, "Person", 0));
  await page.getByRole("dialog").getByRole("button", { name: "Assign person" }).click();
  await expect(page.getByRole("link", { name: first })).toBeVisible();
  await expect(page.getByRole("button", { name: "Assign" })).toHaveCount(0);

  await page.getByRole("button", { name: "Replace" }).click();
  await expect(page.getByRole("dialog")).toContainText(`${first} steps down`);
  const next = asName(await chooseSomeone(page, "Taking over", 0));
  await page.getByRole("dialog").getByRole("button", { name: "Replace" }).click();
  await expect(page.getByRole("link", { name: next })).toBeVisible();
  await expect(page.getByRole("link", { name: first })).toHaveCount(0);

  await page.getByRole("button", { name: new RegExp(`^End ${next} as Lead`) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "End assignment" }).click();
  await expect(page.getByText("Vacant")).toBeVisible();
  await expect(page.getByRole("button", { name: "Assign" })).toBeVisible();
});
