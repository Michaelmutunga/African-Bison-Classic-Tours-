import { expect, request as baseRequest, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";

test.setTimeout(300_000);

test("inquiries land in the admin notification feed", async ({ request }) => {
  const stamp = Date.now().toString(36);
  const email = `notify-${stamp}@example.com`;
  const created = await request.post("/api/inquiries", {
    data: {
      name: "Notify Guest",
      email,
      message: "Please plan ten magic days for us in Kenya soon.",
    },
  });
  expect(created.status()).toBe(201);
  const { reference } = (await created.json()) as { reference: string };

  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  const login = await ctx.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(login.status()).toBe(200);
  const feed = await ctx.get("/api/admin/notifications?event=inquiry.received");
  expect(feed.status()).toBe(200);
  const body = (await feed.json()) as {
    notifications: { toAddress: string | null; status: string }[];
  };
  const match = body.notifications.find((n) => n.toAddress === email);
  expect(match).toBeTruthy();
  expect(match?.status).toBe("SENT");
  void reference;
  await ctx.dispose();
});

test("booking confirmation surfaces in the customer portal feed", async ({ page, request }) => {
  const stamp = Date.now().toString(36);
  const email = `portal-notify-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: {
      customerName: "Portal Notify",
      customerEmail: email,
      travelStart: "2027-09-18T06:00:00Z",
      travelEnd: "2027-09-24T18:00:00Z",
      adults: 2,
    },
  });
  const { reference } = (await created.json()) as { reference: string };

  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  await ctx.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  const listed = (await (await ctx.get("/api/admin/bookings")).json()) as {
    bookings: { id: string; reference: string }[];
  };
  const booking = listed.bookings.find((b) => b.reference === reference);
  if (!booking) throw new Error("booking missing");
  for (const status of ["IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "AWAITING_PAYMENT", "CONFIRMED"]) {
    const moved = await ctx.patch(`/api/admin/bookings/${booking.id}`, { data: { status } });
    expect(moved.status(), status).toBe(200);
  }
  await ctx.dispose();

  // Register over HTTP (UI registration is covered by phase8 e2e), then
  // carry the session cookie into the browser to assert the portal feed.
  const registered = await request.post("/api/account/register", {
    data: { name: "Portal Notify", email, password: "Notify-Password-123!" },
  });
  expect(registered.status()).toBe(201);
  const setCookie = registered.headers()["set-cookie"] ?? "";
  const sessionValue = setCookie.split(";")[0]?.split("=")[1];
  if (!sessionValue) throw new Error("registration set no session cookie");
  await page.context().addCookies([
    { name: "bison_session", value: sessionValue, domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Latest updates")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Your journey is reserved").first()).toBeVisible({ timeout: 30_000 });
});
