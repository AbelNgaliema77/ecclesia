import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./support";

test.use({ storageState: ADMIN_STATE });

test("keeps a headcount on the phone without signal and syncs it later", async ({
  page,
  context,
}) => {
  await page.goto("/attendance");
  await page.getByRole("button", { name: "Open headcount" }).click();
  await expect(page).toHaveURL(/\/attendance\/[0-9a-f-]{36}$/);
  const counter = page.getByRole("textbox", { name: "Men", exact: true });
  const before = Number(await counter.inputValue());

  await context.setOffline(true);
  await page.getByRole("button", { name: "Add one to Men" }).first().click();
  await page.getByRole("button", { name: "Add one to Men" }).first().click();
  await page.getByRole("button", { name: "Save headcount" }).click();
  await expect(page.getByText("saved on this phone and hasn’t reached the server")).toBeVisible();
  await expect(page.getByText("1 headcount is waiting to sync")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText("1 saved headcount synced")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("waiting to sync")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Men", exact: true })).toHaveValue(
    String(before + 2),
  );
});
