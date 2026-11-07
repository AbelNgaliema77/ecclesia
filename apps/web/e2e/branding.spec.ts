import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./support";

test.use({ storageState: ADMIN_STATE });

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("changes the colour theme and logo for the whole church", async ({ page }) => {
  await page.goto("/settings/branding");

  await expect(page.getByRole("radio", { name: "Ocean" })).toBeEnabled();
  await page.getByText("Ocean").click();
  await page.getByRole("button", { name: "Save theme" }).click();
  await expect(page.getByText("Theme updated")).toBeVisible();
  await expect(page.locator("[data-brand='ocean']:has(main)")).toBeVisible();

  await page
    .locator('input[name="logo"]')
    .setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Logo updated")).toBeVisible();
  const logo = page.locator('aside img[src^="/branding/logo"]');
  await expect(logo).toBeVisible();
  const response = await page.request.get((await logo.getAttribute("src")) ?? "");
  expect(response.headers()["content-type"]).toBe("image/png");

  await page.locator('input[name="logo"]').setInputFiles({
    name: "logo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
  });
  await expect(page.getByText("Use a PNG, JPG or WebP image.")).toBeVisible();

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Logo removed")).toBeVisible();
  await page.getByText("Forest").click();
  await page.getByRole("button", { name: "Save theme" }).click();
  await expect(page.locator("[data-brand='ocean']:has(main)")).toHaveCount(0);
});
