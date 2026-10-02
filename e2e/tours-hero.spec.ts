import { expect, test, type Page } from "@playwright/test";

/** The dev server hydrates slowly on this machine; never touch the page before hydration. */
async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.hydrated === "true",
    null,
    { timeout: 180_000 },
  );
}

test.describe("tours sticky hero", () => {
  test.setTimeout(300_000);

  test("pins the image while one h1 and the CTAs scroll over it", async ({
    page,
  }) => {
    await page.goto("/tours", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    const hero = page.getByTestId("tours-hero");
    await expect(hero).toBeVisible({ timeout: 60_000 });
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveAttribute(
      "aria-label",
      "Journeys across Kenya and Tanzania.",
    );
    // Pinned backdrop: sticky image, no video anywhere in the hero.
    const backdrop = page.getByTestId("tours-hero-backdrop");
    await expect(backdrop).toBeAttached();
    await expect(backdrop).toHaveCSS("position", "sticky");
    await expect(hero.locator("video")).toHaveCount(0);
    // Scroll through the beats: the page moves more than one viewport
    // while the sticky backdrop stays pinned to the viewport top.
    await page.getByRole("link", { name: "Choose your safari" }).scrollIntoViewIfNeeded();
    await expect(
      page.getByRole("link", { name: "Choose your safari" }),
    ).toBeVisible();
    const scrolled = await page.evaluate(() => window.scrollY);
    const viewport = await page.evaluate(() => window.innerHeight);
    expect(scrolled).toBeGreaterThan(viewport);
    const box = await backdrop.boundingBox();
    expect(box?.y ?? NaN).toBeLessThanOrEqual(2);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(viewport - 2);
    await expect(page.getByRole("link", { name: "Enter the dome" })).toBeVisible();
  });

  test("mobile shows the beats without overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tours", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(page.getByTestId("tours-hero")).toBeVisible({
      timeout: 60_000,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("tours hero reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the same pinned layout with no motion", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/tours", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(
      page.getByRole("heading", {
        name: "Journeys across Kenya and Tanzania.",
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("tours-hero-backdrop")).toBeAttached();
    await expect(page.locator("#tours-hero video, [data-testid='tours-hero'] video")).toHaveCount(0);
  });
});
