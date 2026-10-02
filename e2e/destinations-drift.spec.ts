import { expect, test } from "@playwright/test";

// Serial within this file: the wall, photos and seven tests in parallel
// melt the dev server (compile per route + image optimization), which
// flakes timing-sensitive assertions.
test.describe.configure({ mode: "serial" });

test("destinations wall showcases tiles that open detail pages", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/destinations", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 60_000,
  });

  const wrap = page.getByTestId("drift-wall-wrap");
  await expect(wrap).toBeVisible();

  // Wall tiles link to internal destination pages, never remote hosts.
  const wallLinks = wrap.locator('a[href^="/destinations/"]');
  await expect(wallLinks.first()).toBeVisible({ timeout: 30_000 });
  const href = await wallLinks.first().getAttribute("href");
  expect(href).toMatch(/^\/destinations\//);

  // Following a tile lands on the destination detail page.
  await wallLinks.first().click();
  await expect(page).toHaveURL(/\/destinations\/.+/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 60_000,
  });
});

test("destinations index lists every destination with working links", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  await page.goto("/destinations", { waitUntil: "domcontentloaded" });
  const index = page.getByRole("list", { name: "Destination index" });
  await expect(index).toBeVisible({ timeout: 60_000 });

  const items = index.locator("li");
  expect(await items.count()).toBeGreaterThanOrEqual(10);

  const hrefs = await index.evaluate((list) =>
    [...list.querySelectorAll("a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h): h is string => h !== null),
  );
  const detailLinks = [...new Set(hrefs)].filter((h) =>
    h.startsWith("/destinations/"),
  );
  expect(detailLinks.length).toBeGreaterThanOrEqual(10);
  for (const href of detailLinks.slice(0, 6)) {
    const response = await request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});

test("destinations region filter narrows wall and index together", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/destinations", { waitUntil: "domcontentloaded" });
  // Wait for the hydrated (live) section: pre-hydration clicks are no-ops.
  await page.locator('section[data-ready="true"]').waitFor({ timeout: 60_000 });
  const index = page.getByRole("list", { name: "Destination index" });
  await expect(index).toBeVisible({ timeout: 60_000 });
  const before = await index.locator("li").count();

  await page.getByRole("button", { name: "Tanzania", exact: true }).click();
  await expect(index.locator("li").first()).toContainText("Tanzania");
  const after = await index.locator("li").count();
  expect(after).toBeLessThan(before);

  await page.getByRole("button", { name: "All", exact: true }).click();
  expect(await index.locator("li").count()).toBe(before);
});

test("destinations calm users get a still photo grid", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/destinations", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("drift-wall-still")).toBeVisible({
    timeout: 60_000,
  });
});

test("ledger rows carry numerals, safari counts and hover photos", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/destinations", { waitUntil: "domcontentloaded" });
  await page.locator('section[data-ready="true"]').waitFor({ timeout: 60_000 });
  const index = page.getByRole("list", { name: "Destination index" });
  await expect(index).toBeVisible({ timeout: 60_000 });

  const first = index.locator("li").first();
  await expect(first).toContainText("01");
  await expect(first).toContainText(/safari|On request/);

  // Hovering unfolds the park photograph at the row's right end.
  await first.locator("a").first().hover();
  await expect(first.getByTestId("ledger-reveal")).toBeVisible({ timeout: 30_000 });
});

test("ledger row opens its destination detail page", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/destinations", { waitUntil: "domcontentloaded" });
  await page.locator('section[data-ready="true"]').waitFor({ timeout: 60_000 });
  const index = page.getByRole("list", { name: "Destination index" });
  await expect(index).toBeVisible({ timeout: 60_000 });

  await index.locator("li").first().locator("a").first().click();
  await expect(page).toHaveURL(/\/destinations\/.+/, { timeout: 60_000 });
});

test("region filter renumbers the ledger from 01", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/destinations", { waitUntil: "domcontentloaded" });
  await page.locator('section[data-ready="true"]').waitFor({ timeout: 60_000 });
  const index = page.getByRole("list", { name: "Destination index" });
  await expect(index).toBeVisible({ timeout: 60_000 });

  await page.getByRole("button", { name: "Tanzania", exact: true }).click();
  await expect(index.locator("li").first()).toContainText("01");
  await expect(index.locator("li").first()).toContainText("Tanzania");
});
