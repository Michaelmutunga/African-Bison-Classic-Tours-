import { expect, test, type Page } from "@playwright/test";

/** The dev server hydrates slowly on this machine; never touch the page before hydration. */
async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.hydrated === "true",
    null,
    { timeout: 180_000 },
  );
}

test.describe("tours video-text hero", () => {
  test.setTimeout(300_000);

  test("has one h1 with video inside JOURNEYS and a pause control", async ({
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
    const video = page.getByTestId("tours-hero-video");
    await expect(video).toBeAttached();
    await expect(video).toHaveAttribute("src", "/video/hero.mp4");
    await expect(video).toHaveAttribute("muted", "");
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("preload", "metadata");
    const pause = page.getByTestId("tours-hero-pause");
    await expect(pause).toBeVisible();
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed", "false");
    // Existing hero content survives below the video word.
    await expect(
      page.getByRole("link", { name: "Choose your safari" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Enter the dome" })).toBeVisible();
  });

  test("mobile shows the video word without overflow", async ({ page }) => {
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

  test("shows solid type with no video", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/tours", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(
      page.getByRole("heading", {
        name: "Journeys across Kenya and Tanzania.",
      }),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("tours-hero-video")).toHaveCount(0);
    await expect(page.getByTestId("tours-hero-pause")).toHaveCount(0);
  });
});
