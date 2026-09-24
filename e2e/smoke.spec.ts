import { expect, test } from "@playwright/test";

test("homepage loads", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "East African safaris, designed around you." }),
  ).toBeVisible({ timeout: 60_000 });
});

test("health endpoint reports status", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toMatch(/ok|degraded/);
});

for (const path of ["/tours", "/destinations", "/blog", "/contact"]) {
  test(`shell route ${path} loads`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  });
}
