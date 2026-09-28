import { expect, test } from "@playwright/test";

test.setTimeout(300_000);

test("public concierge answers from the catalogue", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const opener = page.getByRole("button", { name: "Open safari concierge" });
  await opener.scrollIntoViewIfNeeded();
  // The widget hydrates client-side; a pre-hydration click is a no-op, so retry.
  let opened = false;
  for (let attempt = 0; attempt < 4 && !opened; attempt++) {
    await opener.click();
    opened = await page
      .getByRole("heading", { name: "Safari concierge" })
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
  }
  expect(opened).toBe(true);
  await page.getByRole("button", { name: "Where can I go?" }).click();
  await expect(page.getByText("Kenya", { exact: false }).first()).toBeVisible({ timeout: 60_000 });
});

test("signed-in customers only reach their own bookings", async ({ request }) => {
  const stamp = Date.now().toString(36);
  const email = `concierge-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: { customerName: "Concierge Guest", customerEmail: email, adults: 2 },
  });
  expect(created.status()).toBe(201);
  const { reference } = (await created.json()) as { reference: string };

  const registered = await request.post("/api/account/register", {
    data: { name: "Concierge Guest", email, password: "Concierge-Password-123!" },
  });
  expect(registered.status()).toBe(201);

  const own = await request.post("/api/concierge", {
    data: { message: `What is the status of ${reference}?` },
  });
  expect(own.status()).toBe(200);
  const ownBody = (await own.json()) as { ok: boolean; reply: string };
  expect(ownBody.ok).toBe(true);
  expect(ownBody.reply).toContain(reference);

  const other = await request.post("/api/concierge", {
    data: { message: "What is the balance on ABCT-2099-NOSUCHBOOKING?" },
  });
  expect(other.status()).toBe(200);
  const otherBody = (await other.json()) as { ok: boolean; reply: string };
  expect(otherBody.ok).toBe(true);
  expect(otherBody.reply).toContain("can't find");
});
