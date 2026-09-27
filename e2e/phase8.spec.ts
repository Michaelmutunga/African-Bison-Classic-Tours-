import { expect, test, type Page } from "@playwright/test";

test.setTimeout(300_000);

async function register(page: Page, localPart: string, name = "Portal Voyager"): Promise<string> {
  const email = `${localPart}@example.com`;
  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Password/).fill("Voyager-Password-123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  return email;
}

test("registration claims guest bookings into the dashboard", async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const email = `claim-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: { customerName: "Claim Guest", customerEmail: email, adults: 2 },
  });
  expect(created.status()).toBe(201);
  const { reference } = (await created.json()) as { reference: string };

  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Full name").fill("Claim Guest");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Password/).fill("Claim-Password-123!");
  // Re-click tolerant: a pre-hydration click natively reloads instead.
  await expect(async () => {
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  }).toPass({ timeout: 120_000 });
  await expect(page.getByText(reference).first()).toBeVisible({ timeout: 30_000 });
});

test("full portal journey for one owner", async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const email = `journey-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: {
      customerName: "Journey Owner",
      customerEmail: email,
      travelStart: "2027-09-18T06:00:00Z",
      travelEnd: "2027-09-24T18:00:00Z",
      adults: 2,
    },
  });
  const { reference } = (await created.json()) as { reference: string };

  await page.goto("/register", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Full name").fill("Journey Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/Password/).fill("Journey-Password-123!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });

  await page.goto(`/safari/${reference}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Pre-trip checklist")).toBeVisible();
  await expect(page.getByText("Safari passport")).toBeVisible();

  // Travellers tab (re-click tolerant: pre-hydration clicks are no-ops).
  await expect(async () => {
    await page.getByRole("tab", { name: /Travellers/ }).click();
    await expect(page.getByRole("button", { name: "Add traveller" })).toBeVisible({
      timeout: 5_000,
    });
  }).toPass({ timeout: 60_000 });
  await page.getByRole("button", { name: "Add traveller" }).click();
  await page.getByLabel(/Full name \(as in passport\)/).fill("Journey Owner");
  await page.getByLabel("Nationality").fill("Kenyan");
  await page.getByLabel("Passport number").fill("J1234567");
  await page.getByRole("button", { name: "Add traveller", exact: true }).click();
  await expect(page.getByText("Journey Owner").first()).toBeVisible({ timeout: 30_000 });

  // Payments tab shows honest zero state.
  await expect(async () => {
    await page.getByRole("tab", { name: "Payments" }).click();
    await expect(page.getByText("No payments yet.")).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });

  // Documents tab lists the generated confirmation.
  await expect(async () => {
    await page.getByRole("tab", { name: "Documents" }).click();
    await expect(page.getByText("Booking confirmation")).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });

  // Messages tab round-trips.
  await expect(async () => {
    await page.getByRole("tab", { name: /Messages/ }).click();
    await expect(page.getByLabel("Message your safari team")).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 60_000 });
  await page.getByLabel("Message your safari team").fill("What time is pickup on day 1?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("What time is pickup on day 1?")).toBeVisible({ timeout: 30_000 });
});

test("customers cannot see each other's safaris", async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const other = await request.post("/api/bookings", {
    data: { customerName: "Other Person", customerEmail: `other-${stamp}@example.com`, adults: 1 },
  });
  const { reference } = (await other.json()) as { reference: string };
  await register(page, `iso-${stamp}`);
  await page.goto(`/safari/${reference}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByText("This page could not be found.").first()).toBeVisible({
    timeout: 60_000,
  });
});

test("portal works on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const stamp = Date.now().toString(36);
  await register(page, `mob-${stamp}`);
  await expect(page.getByRole("navigation", { name: "Customer portal" })).toBeVisible({
    timeout: 60_000,
  });
});
