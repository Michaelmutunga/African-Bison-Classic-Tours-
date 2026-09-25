import { expect, request as baseRequest, test } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";

test("guest checkout creates a booking with a reference", async ({ request }) => {
  const stamp = Date.now().toString(36);
  const response = await request.post("/api/bookings", {
    data: {
      customerName: "Phase Six Guest",
      customerEmail: `phase6-${stamp}@example.com`,
      travelStart: "2027-09-18T06:00:00Z",
      travelEnd: "2027-09-24T18:00:00Z",
      adults: 2,
      idempotencyKey: `phase6-${stamp}`,
    },
  });
  expect(response.status()).toBe(201);
  const body = (await response.json()) as { reference: string; status: string };
  expect(body.reference).toMatch(/^ABCT-\d{4}-/);
  expect(body.status).toBe("INQUIRY");

  // Duplicate key returns the original, not a second booking.
  const retry = await request.post("/api/bookings", {
    data: {
      customerName: "Someone Else",
      customerEmail: `phase6-${stamp}@example.com`,
      idempotencyKey: `phase6-${stamp}`,
    },
  });
  expect(retry.status()).toBe(201);
  expect(((await retry.json()) as { reference: string }).reference).toBe(body.reference);
});

test("booking lookup needs the matching email", async ({ request }) => {
  const stamp = Date.now().toString(36);
  const email = `lookup-${stamp}@example.com`;
  const created = await request.post("/api/bookings", {
    data: { customerName: "Lookup Guest", customerEmail: email },
  });
  const { reference } = (await created.json()) as { reference: string };

  const found = await request.get(
    `/api/bookings/lookup?reference=${reference}&email=${email}`,
  );
  expect(found.status()).toBe(200);
  expect(((await found.json()) as { booking: { reference: string } }).booking.reference).toBe(
    reference,
  );
  const wrong = await request.get(
    `/api/bookings/lookup?reference=${reference}&email=wrong@example.com`,
  );
  expect(wrong.status()).toBe(404);
});

test("guest can cancel with email proof; staff advances lifecycle", async () => {
  test.setTimeout(240_000);
  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  const login = await ctx.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(login.status()).toBe(200);

  const stamp = Date.now().toString(36);
  const created = await ctx.post("/api/bookings", {
    data: {
      customerName: "Lifecycle Guest",
      customerEmail: `lifecycle-${stamp}@example.com`,
      travelStart: "2027-09-18T06:00:00Z",
      travelEnd: "2027-09-24T18:00:00Z",
      adults: 2,
    },
  });
  expect(created.status()).toBe(201);
  const { reference } = (await created.json()) as { reference: string };

  const listed = (await (await ctx.get("/api/admin/bookings")).json()) as {
    bookings: { id: string; reference: string }[];
  };
  const booking = listed.bookings.find((b) => b.reference === reference);
  expect(booking).toBeTruthy();
  if (!booking) throw new Error("booking missing from admin list");

  // Illegal jump is rejected.
  const bad = await ctx.patch(`/api/admin/bookings/${booking.id}`, {
    data: { status: "CONFIRMED" },
  });
  expect(bad.status()).toBe(422);

  for (const status of ["HOLD", "AWAITING_DEPOSIT", "CONFIRMED", "PRE_TRIP", "ON_SAFARI", "COMPLETED"]) {
    const moved = await ctx.patch(`/api/admin/bookings/${booking.id}`, { data: { status } });
    expect(moved.status(), status).toBe(200);
  }
  const detail = (await (await ctx.get(`/api/admin/bookings/${booking.id}`)).json()) as {
    booking: { history: { to: string }[] };
  };
  expect(detail.booking.history.map((h) => h.to)).toContain("COMPLETED");
  await ctx.dispose();

  // Completed bookings cannot be cancelled, even by the guest.
  const guest = await baseRequest.newContext({ baseURL: BASE_URL });
  const cancelled = await guest.post(`/api/bookings/${booking.id}/cancel`, {
    data: { email: `lifecycle-${stamp}@example.com` },
  });
  expect(cancelled.status()).toBe(422);
  await guest.dispose();
});
