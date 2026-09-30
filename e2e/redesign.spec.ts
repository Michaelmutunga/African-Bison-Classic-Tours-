import { expect, test, type Page } from "@playwright/test";

/** The dev server hydrates slowly on this machine; never touch the page before hydration. */
async function waitForHydration(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true", null, {
    timeout: 180_000,
  });
}

test.describe("cinematic homepage", () => {
  test.setTimeout(300_000);

  test("has exactly one visible h1 and more than 10 internal links", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible({ timeout: 60_000 });
    await expect(h1).toHaveCount(1);
    // Split poster characters are aria-hidden; the full sentence survives
    // as the accessible name for screen readers.
    await expect(h1).toHaveAttribute("aria-label", "East African safaris, designed around you.");
    const hrefs = await page.$$eval("a[href]", (anchors) =>
      anchors.map((a) => a.getAttribute("href")).filter((h): h is string => !!h),
    );
    const internal = [...new Set(hrefs)].filter(
      (h) => h.startsWith("/") && !h.startsWith("//") && !h.includes("#"),
    );
    expect(internal.length).toBeGreaterThan(10);
  });

  test("descent chapters advance on scroll and inactive chapters are inert", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
    const stage = page.locator("#descent");
    await expect(stage).toBeVisible();
    // Scroll deep into the pinned scene; chapter 4 content appears.
    await stage.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const el = document.querySelector("#descent");
      if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.clientHeight * 0.9);
    });
    await expect(page.getByText("WILD, ON ITS", { exact: false }).first()).toBeVisible({ timeout: 30_000 });
    // Chapter 1 goes inert once we leave it, so its CTAs leave the tab order.
    await expect(page.locator('[aria-label="Chapter 1"]')).toHaveAttribute("inert", "");
    await expect(page.locator('[aria-label="Chapter 4"]')).not.toHaveAttribute("inert", "");
  });

  test("hero has no video; migration scene has a pausable video", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#descent video")).toHaveCount(0);
    const scene = page.getByTestId("migration-scene");
    await scene.scrollIntoViewIfNeeded();
    const video = page.getByTestId("migration-video");
    await expect(video).toBeAttached();
    await expect(video).toHaveAttribute("muted", "");
    await expect(video).toHaveAttribute("playsinline", "");
    await expect(video).toHaveAttribute("loop", "");
    const pause = page.getByTestId("migration-pause");
    await expect(pause).toBeVisible();
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed", "true");
    await pause.click();
    await expect(pause).toHaveAttribute("aria-pressed", "false");
  });

  test("every image has alt text and no price text appears", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
    const alts = await page.$$eval("img", (imgs) =>
      imgs.map((img) => img.getAttribute("alt")),
    );
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) expect(alt, "img alt").not.toBeNull();
    await expect(page.getByText(/\$\s?\d/)).toBeHidden();
  });

  test("mobile menu traps focus, closes on Escape and restores focus", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    const menu = page.getByRole("button", { name: "Menu" });
    await expect(menu).toBeVisible({ timeout: 60_000 });
    await menu.click();
    const dialog = page.locator("#mobile-menu");
    await expect(dialog).toBeVisible();
    // Focus moves inside the dialog.
    await expect(dialog.getByRole("button", { name: "Close" })).toBeFocused({ timeout: 10_000 });
    // Tab cycles inside (first and last focusable bound the trap natively).
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(["A", "BUTTON"]).toContain(focused);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(menu).toBeFocused();
  });
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("shows the static hero stack with all CTAs and no preloader", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForHydration(page);
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toBeVisible({ timeout: 60_000 });
    await expect(h1).toHaveCount(1);
    // Static stack: no pinned stage, still image, both hero CTAs present.
    await expect(page.locator("#descent")).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Design your safari" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore safaris" }).first()).toBeVisible();
    await expect(page.locator("#descent video")).toHaveCount(0);
    await expect(page.getByTestId("migration-video")).toHaveCount(0);
  });
});
