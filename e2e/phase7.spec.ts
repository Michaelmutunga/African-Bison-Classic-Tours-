import { createHmac } from "node:crypto";
import { expect, request as baseRequest, test, type APIRequestContext } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";

const BASE_URL = "http://127.0.0.1:3000";
const SECRET = process.env.MOCK_PROVIDER_SECRET ?? "dev-mock-secret";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

test("mock webhooks reject bad signatures", async ({ request }) => {
  const response = await request.post("/api/payments/webhook/mock", {
    data: JSON.stringify({ providerRef: "mock_x", type: "succeeded" }),
    headers: { "x-mock-signature": "wrong" },
  });
  expect(response.status()).toBe(401);
});

test("guest pays deposit via mock callback, receipt follows", async ({ request }) => {
  test.setTimeout(180_000);
  const stamp = Date.now().toString(36);
  const email = `pay-${stamp}@example.com`;
  const staff = await baseRequest.newContext({ baseURL: BASE_URL });
  await staff.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  const created = await staff.post("/api/bookings", {
    data: {
      customerName: "Paying Guest",
      customerEmail: email,
      travelStart: "2027-09-18T06:00:00Z",
      travelEnd: "2027-09-24T18:00:00Z",
      adults: 2,
      currency: "USD",
      subtotalCents: 500_000,
      totalCents: 500_000,
      depositCents: 150_000,
    },
  });
  expect(created.status()).toBe(201);
  const { reference } = (await created.json()) as { reference: string };
  const bookingId = await lookupId(staff, reference, email);
  const hold = await staff.patch(`/api/admin/bookings/${bookingId}`, { data: { status: "HOLD" } });
  expect(hold.status()).toBe(200);
  const awaiting = await staff.patch(`/api/admin/bookings/${bookingId}`, {
    data: { status: "AWAITING_DEPOSIT" },
  });
  expect(awaiting.status()).toBe(200);
  await staff.dispose();

  const payment = await request.post("/api/payments", {
    data: { bookingId, amountCents: 150_000, kind: "DEPOSIT", email },
  });
  expect(payment.status()).toBe(201);
  const { payment: createdPayment } = (await payment.json()) as {
    payment: { id: string; providerRef: string };
  };

  // Unknown provider refs 404 without side effects.
  const unknownBody = JSON.stringify({ providerRef: "mock_unknown", type: "succeeded" });
  const unknown = await request.post("/api/payments/webhook/mock", {
    data: unknownBody,
    headers: { "x-mock-signature": sign(unknownBody) },
  });
  expect(unknown.status()).toBe(404);

  const body = JSON.stringify({
    providerRef: createdPayment.providerRef,
    type: "succeeded",
    amountCents: 150_000,
  });
  const first = await request.post("/api/payments/webhook/mock", {
    data: body,
    headers: { "x-mock-signature": sign(body) },
  });
  expect(first.status()).toBe(200);
  expect(((await first.json()) as { applied: boolean }).applied).toBe(true);

  // Duplicate delivery is harmless.
  const second = await request.post("/api/payments/webhook/mock", {
    data: body,
    headers: { "x-mock-signature": sign(body) },
  });
  expect(((await second.json()) as { applied: boolean }).applied).toBe(false);

  const lookup = await request.get(
    `/api/bookings/lookup?reference=${reference}&email=${email}`,
  );
  const booking = ((await lookup.json()) as { booking: { paidCents: number; status: string } }).booking;
  expect(booking.paidCents).toBe(150_000);
  expect(booking.status).toBe("CONFIRMED");

  const receipt = await request.get(
    `/api/payments/${createdPayment.id}/receipt?email=${email}`,
  );
  expect(receipt.status()).toBe(200);
  expect(((await receipt.json()) as { receipt: { amountCents: number } }).receipt.amountCents).toBe(
    150_000,
  );
});

test("staff refunds reduce paid totals", async () => {
  test.setTimeout(180_000);
  const ctx = await baseRequest.newContext({ baseURL: BASE_URL });
  const login = await ctx.post("/api/auth/login", {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(login.status()).toBe(200);

  const stamp = Date.now().toString(36);
  const email = `refund-${stamp}@example.com`;
  const created = await ctx.post("/api/bookings", {
    data: {
      customerName: "Refund Guest",
      customerEmail: email,
      adults: 2,
      currency: "USD",
      subtotalCents: 400_000,
      totalCents: 400_000,
      depositCents: 120_000,
    },
  });
  const { reference } = (await created.json()) as { reference: string };
  const bookingId = await lookupId(ctx, reference, email);
  const awaiting = await ctx.patch(`/api/admin/bookings/${bookingId}`, {
    data: { status: "HOLD" },
  });
  expect(awaiting.status()).toBe(200);
  const awaiting2 = await ctx.patch(`/api/admin/bookings/${bookingId}`, {
    data: { status: "AWAITING_DEPOSIT" },
  });
  expect(awaiting2.status()).toBe(200);

  const payment = await ctx.post("/api/payments", {
    data: { bookingId, amountCents: 120_000, kind: "DEPOSIT", email },
  });
  const { payment: createdPayment } = (await payment.json()) as {
    payment: { id: string; providerRef: string };
  };
  const body = JSON.stringify({
    providerRef: createdPayment.providerRef,
    type: "succeeded",
    amountCents: 120_000,
  });
  await ctx.post("/api/payments/webhook/mock", {
    data: body,
    headers: { "x-mock-signature": sign(body) },
  });

  const refund = await ctx.post(`/api/admin/payments/${createdPayment.id}/refund`, {
    data: { amountCents: 20_000, reason: "goodwill" },
  });
  expect(refund.status()).toBe(201);

  const after = await ctx.get(`/api/bookings/lookup?reference=${reference}&email=${email}`);
  expect(((await after.json()) as { booking: { paidCents: number } }).booking.paidCents).toBe(
    100_000,
  );
  await ctx.dispose();
});

async function lookupId(
  request: APIRequestContext,
  reference: string,
  email: string,
): Promise<string> {
  const lookup = await request.get(`/api/bookings/lookup?reference=${reference}&email=${email}`);
  const body = (await lookup.json()) as { booking: { id: string } };
  return body.booking.id;
}
