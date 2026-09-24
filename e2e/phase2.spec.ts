import { expect, test } from "@playwright/test";

const ROUTES = [
  "/",
  "/tours",
  "/tours/3-days-masai-mara-game-reserve-safari",
  "/tours/7-days-lake-manyara-serengeti-ngorongoro-tarangire-safari",
  "/tours/1-day-tour-nairobi-safari-culture-wildlife-iconic-attractions",
  "/destinations",
  "/destinations/serengeti",
  "/destinations/masai-mara",
  "/experiences",
  "/blog",
  "/about",
  "/contact",
  "/faq",
  "/travel-information",
];

for (const path of ROUTES) {
  test(`route ${path} returns content`, async ({ page }) => {
    test.setTimeout(90_000);
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  });
}

test("tour detail shows itinerary, inclusions and booking CTA", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/tours/3-days-masai-mara-game-reserve-safari", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Day by day")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Day 1", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Included", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Not included" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request this safari" })).toBeVisible();
  // No invented prices anywhere.
  await expect(page.getByText(/\$\s?\d/)).toBeHidden();
});

test("contact enquiry creates a tracked request", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  // Wait for the hydrated (live) form: pre-hydration clicks natively reload.
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Full name").fill("E2E Traveller");
  await page.getByLabel("Email").fill("e2e-traveller@example.com");
  await page.getByLabel("Your trip").fill("Two adults dreaming of the Mara in August.");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText("Enquiry received — thank you.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/INQ-\d{4}-[A-Z2-9]{6}/)).toBeVisible();
});

test("contact enquiry rejects invalid input", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Full name").fill("E2E Traveller");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Your trip").fill("Two adults dreaming of the Mara in August.");
  await page.getByRole("button", { name: "Send enquiry" }).click();
  await expect(page.getByText("Could not send")).toBeVisible({ timeout: 30_000 });
});

test("sitemap lists tours, destinations and posts", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).toContain("/tours/3-days-masai-mara-game-reserve-safari");
  expect(xml).toContain("/destinations/serengeti");
  expect(xml).toContain("/blog/");
});

test("homepage internal links all resolve", async ({ page, request }) => {
  test.setTimeout(600_000);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const hrefs = await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => a.getAttribute("href")).filter((h): h is string => !!h),
  );
  const internal = [...new Set(hrefs)].filter(
    (h) => h.startsWith("/") && !h.startsWith("//") && !h.includes("#"),
  );
  expect(internal.length).toBeGreaterThan(10);
  // Batched: the dev server compiles each route on first visit.
  const batchSize = 6;
  for (let i = 0; i < internal.length; i += batchSize) {
    const batch = internal.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (href) => ({ href, status: (await request.get(href)).status() })),
    );
    for (const { href, status } of results) {
      expect(status, href).toBeLessThan(400);
    }
  }
});
