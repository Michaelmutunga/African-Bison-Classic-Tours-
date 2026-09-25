import { expect, request as baseRequest, test } from "@playwright/test";
import { E2E_ADMIN, E2E_CONSULTANT } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";

async function apiContext() {
  return baseRequest.newContext({ baseURL: BASE_URL });
}

async function loginAs(email: string, password: string) {
  const ctx = await apiContext();
  const response = await ctx.post("/api/auth/login", { data: { email, password } });
  return { ctx, response };
}

test("anonymous catalogue writes are rejected with 401", async ({ request }) => {
  const response = await request.post("/api/admin/tours", {
    data: { title: "Sneaky", categoryId: "x", durationDays: 2, excerpt: "Nope, too short?" },
  });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.code).toBe("unauthorized");
});

test("login rejects wrong passwords", async () => {
  const { ctx, response } = await loginAs(E2E_ADMIN.email, "wrong-password");
  expect(response.status()).toBe(401);
  await ctx.dispose();
});

test("consultant without write permission gets 403", async () => {
  const { ctx, response } = await loginAs(E2E_CONSULTANT.email, E2E_CONSULTANT.password);
  expect(response.status()).toBe(200);
  const create = await ctx.post("/api/admin/tours", {
    data: { title: "Consultant tour", categoryId: "x", durationDays: 2, excerpt: "Long enough excerpt here." },
  });
  expect(create.status()).toBe(403);
  await ctx.dispose();
});

test("admin tour lifecycle: create draft, hidden, publish, visible, delete", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const { ctx, response } = await loginAs(E2E_ADMIN.email, E2E_ADMIN.password);
  expect(response.status()).toBe(200);

  const slug = `e2e-tour-${Date.now().toString(36)}`;
  const categories = await (await ctx.get("/api/admin/categories")).json();
  const categoryId = categories.categories[0].id as string;

  const created = await ctx.post("/api/admin/tours", {
    data: {
      title: "E2E Created Safari",
      slug,
      categoryId,
      durationDays: 2,
      excerpt: "A safari created by the end-to-end suite.",
      overview: ["Created for verification."],
      includes: ["Everything for the test."],
      excludes: ["Nothing for the test."],
      days: [{ dayNumber: 1, title: "Day 1: Arrival", body: "You arrive and rest well." }],
    },
  });
  expect(created.status()).toBe(201);

  // Draft: invisible to the public.
  expect(await (await request.get(`/tours/${slug}`)).status()).toBe(404);

  // Duplicate slug is a conflict, not a silent overwrite.
  const duplicate = await ctx.post("/api/admin/tours", {
    data: {
      title: "E2E Duplicate Safari",
      slug,
      categoryId,
      durationDays: 2,
      excerpt: "A duplicate created by the end-to-end suite.",
    },
  });
  expect(duplicate.status()).toBe(409);

  // Publish → publicly visible.
  const tourId = ((await created.json()).tour as { id: string }).id;
  const published = await ctx.post(`/api/admin/tours/${tourId}`, {
    data: { published: true },
  });
  expect(published.status()).toBe(200);
  await page.goto(`/tours/${slug}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "E2E Created Safari" })).toBeVisible({
    timeout: 60_000,
  });

  // Invalid updates are rejected with details.
  const badUpdate = await ctx.patch(`/api/admin/tours/${tourId}`, { data: { title: "x" } });
  expect(badUpdate.status()).toBe(422);

  // Delete removes the tour and its days.
  const deleted = await ctx.delete(`/api/admin/tours/${tourId}`);
  expect(deleted.status()).toBe(200);
  expect(await (await request.get(`/tours/${slug}`)).status()).toBe(404);

  const me = await ctx.get("/api/auth/me");
  expect(me.status()).toBe(200);
  await ctx.post("/api/auth/logout");
  expect(await (await ctx.get("/api/auth/me")).status()).toBe(401);
  await ctx.dispose();
});

test("admin console requires sign in", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/admin/tours", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
});

test("staff can sign in through the UI and see tours", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/tours/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Catalogue" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New tour" })).toBeVisible();
});
