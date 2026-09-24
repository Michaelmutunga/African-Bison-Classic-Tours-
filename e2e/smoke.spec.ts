import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("YOUR AFRICA. YOUR WAY.")).toBeVisible({ timeout: 60_000 });
});

test("health endpoint reports status", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toMatch(/ok|degraded/);
});
