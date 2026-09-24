import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("mobile shows menu button and collapses primary nav", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
  const mobile = page.getByRole("navigation", { name: "Mobile" });
  // Clicks before React hydration are no-ops; re-click until the panel opens.
  await expect(async () => {
    if ((await mobile.count()) === 0) await menu.click();
    await expect(mobile).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
});

test("desktop shows primary nav and hides menu button", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("button", { name: "Menu" })).toBeHidden();
});
