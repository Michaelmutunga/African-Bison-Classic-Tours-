import { expect, request as baseRequest, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";

test.setTimeout(300_000);

async function staffContext() {
  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  const login = await ctx.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(login.status()).toBe(200);
  return ctx;
}

test("anonymous admin routes redirect to sign in", async ({ page }) => {
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });
});

test("customers cannot reach operations", async ({ request }) => {
  const stamp = Date.now().toString(36);
  const email = `cust-${stamp}@example.com`;
  const registered = await request.post("/api/account/register", {
    data: { name: "Ops Customer", email, password: "Customer-Password-123!" },
  });
  expect(registered.status()).toBe(201);
  const setCookie = registered.headers()["set-cookie"] ?? "";
  const session = setCookie.split(";")[0];
  const vehicles = await request.get("/api/admin/vehicles", { headers: { cookie: session ?? "" } });
  expect(vehicles.status()).toBe(403);
  // Logged-in customers are forbidden (403); anonymous callers get 401.
  const dashboard = await request.get("/api/admin/dashboard", { headers: { cookie: session ?? "" } });
  expect(dashboard.status()).toBe(403);
  // Fresh context: the register call above stored a session cookie in this
  // context's jar, so anonymity needs a clean room.
  const cleanRoom = await baseRequest.newContext({ baseURL: BASE_URL });
  const anonymous = await cleanRoom.get("/api/admin/dashboard");
  expect(anonymous.status()).toBe(401);
  await cleanRoom.dispose();
});

test("operations dashboard shows real numbers", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await expect(async () => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });
  }).toPass({ timeout: 120_000 });
  await page.goto("/admin", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Active bookings")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Booking pipeline")).toBeVisible();
});

test("fleet lifecycle with conflict protection", async () => {
  const ctx = await staffContext();
  const stamp = Date.now().toString(36);
  const vehicle = await ctx.post("/api/admin/vehicles", {
    data: { registration: `E2E${stamp}`.slice(0, 10).toUpperCase(), type: "4x4", capacity: 6 },
  });
  expect(vehicle.status()).toBe(201);
  const { vehicle: created } = (await vehicle.json()) as { vehicle: { id: string } };

  const booking = await ctx.post("/api/bookings", {
    data: {
      customerName: "Fleet Guest",
      customerEmail: `fleet-${stamp}@example.com`,
      travelStart: "2027-09-18T06:00:00Z",
      travelEnd: "2027-09-24T18:00:00Z",
      adults: 2,
    },
  });
  const { reference } = (await booking.json()) as { reference: string };
  const listed = (await (await ctx.get("/api/admin/bookings")).json()) as {
    bookings: { id: string; reference: string }[];
  };
  const target = listed.bookings.find((b) => b.reference === reference);
  if (!target) throw new Error("booking missing");

  const assigned = await ctx.post(`/api/admin/vehicles/${created.id}/assign`, {
    data: {
      bookingId: target.id,
      startsAt: "2027-09-18T06:00:00Z",
      endsAt: "2027-09-24T18:00:00Z",
    },
  });
  expect(assigned.status()).toBe(201);

  const other = await ctx.post("/api/bookings", {
    data: { customerName: "Fleet Other", customerEmail: `fleet2-${stamp}@example.com`, adults: 2 },
  });
  const otherRef = ((await other.json()) as { reference: string }).reference;
  const relisted = (await (await ctx.get("/api/admin/bookings")).json()) as {
    bookings: { id: string; reference: string }[];
  };
  const otherBooking = relisted.bookings.find((b) => b.reference === otherRef);
  if (!otherBooking) throw new Error("second booking missing");
  const clash = await ctx.post(`/api/admin/vehicles/${created.id}/assign`, {
    data: {
      bookingId: otherBooking.id,
      startsAt: "2027-09-20T06:00:00Z",
      endsAt: "2027-09-26T18:00:00Z",
    },
  });
  expect(clash.status()).toBe(409);

  const calendar = await ctx.get("/api/admin/calendar?from=2027-09-01T00:00:00Z&to=2027-10-01T00:00:00Z");
  expect(calendar.status()).toBe(200);
  const { events } = (await calendar.json()) as { events: unknown[] };
  expect(events.length).toBeGreaterThan(0);
  await ctx.dispose();
});

test("booking workspace advances status and records notes", async ({ page }) => {
  const ctx = await staffContext();
  const stamp = Date.now().toString(36);
  const created = await ctx.post("/api/bookings", {
    data: { customerName: "Workspace Guest", customerEmail: `ws-${stamp}@example.com`, adults: 2 },
  });
  const { reference } = (await created.json()) as { reference: string };
  const listed = (await (await ctx.get("/api/admin/bookings")).json()) as {
    bookings: { id: string; reference: string }[];
  };
  const target = listed.bookings.find((b) => b.reference === reference);
  if (!target) throw new Error("booking missing");
  await ctx.dispose();

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await expect(async () => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });
  }).toPass({ timeout: 120_000 });

  await page.goto(`/admin/bookings/${target.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Workspace Guest" })).toBeVisible({ timeout: 60_000 });
  // Re-click tolerant: pre-hydration clicks are no-ops, post-success the button is gone.
  await expect(async () => {
    const review = page.getByRole("button", { name: "→ IN REVIEW" });
    if (await review.count()) await review.click();
    await expect(page.getByText("IN REVIEW", { exact: true }).first()).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 120_000 });

  await page.getByLabel(/Internal note/).fill("E2E operations note.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("E2E operations note.")).toBeVisible({ timeout: 60_000 });
});

test("itinerary reorder persists through the editor", async ({ page }) => {
  const ctx = await staffContext();
  const stamp = Date.now().toString(36);
  const categories = (await (await ctx.get("/api/admin/categories")).json()) as {
    categories: { id: string }[];
  };
  const created = await ctx.post("/api/admin/tours", {
    data: {
      title: `Reorder Safari ${stamp}`,
      categoryId: categories.categories[0]?.id,
      durationDays: 2,
      excerpt: "A reorder test safari with enough words.",
      days: [
        { dayNumber: 1, title: "Day 1: Alpha", body: "Alpha body text here." },
        { dayNumber: 2, title: "Day 2: Beta", body: "Beta body text here." },
      ],
    },
  });
  expect(created.status()).toBe(201);
  const { tour } = (await created.json()) as { tour: { id: string } };
  await ctx.dispose();

  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await expect(async () => {
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 30_000 });
  }).toPass({ timeout: 120_000 });

  await page.goto(`/admin/tours/${tour.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Edit tour" })).toBeVisible({ timeout: 60_000 });
  await page.locator('form[data-ready="true"]').waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: "Move day 1 later" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/admin\/tours$/, { timeout: 60_000 });

  // Reload the editor: Beta must now lead, proving the reorder persisted.
  await page.goto(`/admin/tours/${tour.id}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Edit tour" })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByLabel("Day title").first()).toHaveValue("Day 2: Beta");
});
