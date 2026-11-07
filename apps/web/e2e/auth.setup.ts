import { test as setup } from "@playwright/test";
import { ADMIN, ADMIN_STATE, LEADER, LEADER_STATE, signIn } from "./support";

setup("sign in as the demo admin", async ({ page }) => {
  await signIn(page, ADMIN);
  await page.context().storageState({ path: ADMIN_STATE });
});

setup("sign in as the demo team leader", async ({ page }) => {
  await signIn(page, LEADER);
  await page.context().storageState({ path: LEADER_STATE });
});
