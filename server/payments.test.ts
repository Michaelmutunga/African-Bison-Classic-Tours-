import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { createBooking, setBookingStatus } from "@/server/bookings";
import { testActor, unique } from "@/tests/db";
import {
  PaymentError,
  applyWebhookEvent,
  createPayment,
  getPayment,
  listPayments,
  receiptData,
  reconcilePayment,
  refundPayment,
  retryPayment,
} from "@/server/payments";
import { ProviderTimeoutError, mockProvider } from "@/server/payments/providers";

const admin = testActor("ADMIN");

async function paidBooking(overrides: Record<string, unknown> = {}) {
  const booking = await createBooking(null, {
    customerName: "Paying Guest",
    customerEmail: `${unique("pay")}@example.com`,
    travelStart: "2027-09-18T06:00:00Z",
    travelEnd: "2027-09-24T18:00:00Z",
    adults: 2,
    currency: "USD",
    subtotalCents: 500_000,
    totalCents: 500_000,
    depositCents: 150_000,
    ...overrides,
  });
  // Real flow: staff place a hold / accept the terms before money moves.
  await setBookingStatus(admin, booking.id, "HOLD", "test setup");
  await setBookingStatus(admin, booking.id, "AWAITING_DEPOSIT", "test setup");
  return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
}

function guestArgs(booking: { id: string; customerEmail: string }, extra: Record<string, unknown> = {}) {
  return { bookingId: booking.id, email: booking.customerEmail, ...extra };
}

beforeEach(() => {
  mockProvider.reset();
  process.env.MOCK_PROVIDER_SECRET = "test-secret";
});

describe("successful payments", () => {
  it("creates, applies and auto-confirms on deposit", async () => {
    const booking = await paidBooking();
    const payment = await createPayment(null, guestArgs(booking, { amountCents: 150_000, kind: "DEPOSIT" }));
    expect(payment.status).toBe("PENDING");
    expect(payment.providerRef).toMatch(/^mock_/);
    expect(mockProvider.calls.create).toBe(1);

    const signed = mockProvider.settle(payment.providerRef as string, "succeeded");
    const { body, signature } = JSON.parse(signed) as { body: string; signature: string };
    expect(mockProvider.verifyWebhookSignature(body, signature)).toBe(true);
    const result = await applyWebhookEvent("mock", mockProvider.parseWebhookEvent(body));
    expect(result).toMatchObject({ applied: true, paymentId: payment.id });

    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(fresh.paidCents).toBe(150_000);
    expect(fresh.status).toBe("CONFIRMED"); // deposit met
    const history = await prisma.bookingStatusHistory.findMany({ where: { bookingId: booking.id } });
    expect(history.map((h) => h.to)).toContain("CONFIRMED");
  });

  it("accepts partial payments without confirming", async () => {
    const settle = (providerRef: string) => {
      const envelope = JSON.parse(mockProvider.settle(providerRef, "succeeded")) as { body: string };
      return mockProvider.parseWebhookEvent(envelope.body);
    };
    const booking = await paidBooking();
    const first = await createPayment(null, guestArgs(booking, { amountCents: 50_000 }));
    await applyWebhookEvent("mock", settle(first.providerRef as string));
    const mid = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(mid.paidCents).toBe(50_000);
    expect(mid.status).toBe("AWAITING_DEPOSIT"); // deposit not yet met

    const second = await createPayment(null, guestArgs(booking, { amountCents: 100_000 }));
    await applyWebhookEvent("mock", settle(second.providerRef as string));
    const done = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(done.paidCents).toBe(150_000);
    expect(done.status).toBe("CONFIRMED");
  });

  it("rejects overpayments and wrong currencies", async () => {
    const booking = await paidBooking();
    await expect(
      createPayment(null, guestArgs(booking, { amountCents: 500_001 })),
    ).rejects.toThrow(/exceeds the outstanding balance/);
    await expect(
      createPayment(null, guestArgs(booking, { amountCents: 100, currency: "KES" })),
    ).rejects.toThrow(/must match/);
  });
});

describe("failures, duplicates and delayed callbacks", () => {
  it("records failures without moving money", async () => {
    const booking = await paidBooking();
    const payment = await createPayment(null, guestArgs(booking, { amountCents: 150_000 }));
    await applyWebhookEvent("mock", { type: "failed", providerRef: payment.providerRef as string });
    const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(fresh.status).toBe("FAILED");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).paidCents).toBe(0);
  });

  it("treats duplicate webhooks as harmless", async () => {
    const booking = await paidBooking();
    const payment = await createPayment(null, guestArgs(booking, { amountCents: 150_000 }));
    const event = { type: "succeeded" as const, providerRef: payment.providerRef as string };
    expect((await applyWebhookEvent("mock", event)).applied).toBe(true);
    expect((await applyWebhookEvent("mock", event)).applied).toBe(false);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).paidCents).toBe(150_000);
  });

  it("rejects unknown transactions and bad signatures", async () => {
    await expect(
      applyWebhookEvent("mock", { type: "succeeded", providerRef: "mock_nope" }),
    ).rejects.toThrow(/not found/i);
    const body = JSON.stringify({ providerRef: "x", type: "succeeded" });
    expect(mockProvider.verifyWebhookSignature(body, "wrong")).toBe(false);
    expect(mockProvider.verifyWebhookSignature(body, null)).toBe(false);
    expect(() => mockProvider.parseWebhookEvent("{{broken")).toThrow(/Malformed/);
  });

  it("survives timeout then succeeds on retry", async () => {
    const booking = await paidBooking();
    const key = unique("hang");
    mockProvider.setBehavior(booking.reference, "hang");
    // The mock keys behavior by payment reference passed to the provider,
    // which is the booking reference — hang the first attempt.
    await expect(
      createPayment(null, guestArgs(booking, { amountCents: 150_000, idempotencyKey: key })),
    ).rejects.toThrow(ProviderTimeoutError);
    const pending = await prisma.payment.findFirstOrThrow({
      where: { bookingId: booking.id },
      include: { attempts: true },
    });
    expect(pending.status).toBe("PENDING");
    expect(pending.attempts.map((a) => a.status)).toContain("timeout");

    mockProvider.setBehavior(booking.reference, "succeed");
    const retried = await retryPayment(null, pending.id, booking.customerEmail);
    expect(retried.attempts.map((a) => a.status)).toContain("retried");
    await applyWebhookEvent("mock", {
      type: "succeeded",
      providerRef: retried.providerRef as string,
    });
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).paidCents).toBe(150_000);
  });

  it("reconciles late provider success without double-charging", async () => {
    const booking = await paidBooking();
    const payment = await createPayment(null, guestArgs(booking, { amountCents: 150_000 }));
    mockProvider.settle(payment.providerRef as string, "succeeded"); // provider-side first
    const reconciled = await reconcilePayment(null, payment.id, booking.customerEmail);
    expect(reconciled).toMatchObject({ status: "SUCCEEDED", applied: true });
    // A second reconcile is a no-op.
    expect((await reconcilePayment(null, payment.id, booking.customerEmail)).applied).toBe(false);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).paidCents).toBe(150_000);
  });
});

describe("payments after expiry", () => {
  it("refuses to apply money to dead bookings", async () => {
    const booking = await paidBooking();
    const payment = await createPayment(null, guestArgs(booking, { amountCents: 50_000 }));
    await prisma.booking.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
    await expect(
      applyWebhookEvent("mock", { type: "succeeded", providerRef: payment.providerRef as string }),
    ).rejects.toThrow(PaymentError);
    const fresh = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    expect(fresh.status).toBe("CANCELLED");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).paidCents).toBe(0);
  });
});

describe("refunds", () => {
  async function succeededBooking(amountCents = 150_000) {
    const booking = await paidBooking();
    const payment = await createPayment(null, guestArgs(booking, { amountCents }));
    await applyWebhookEvent("mock", { type: "succeeded", providerRef: payment.providerRef as string });
    return { booking, payment };
  }

  it("refunds in full and in part, never twice", async () => {
    const { booking, payment } = await succeededBooking(200_000);
    const partial = await refundPayment(admin, { paymentId: payment.id, amountCents: 50_000, reason: "goodwill" });
    expect(partial.status).toBe("SUCCEEDED");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).paidCents).toBe(150_000);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("SUCCEEDED");

    const rest = await refundPayment(admin, { paymentId: payment.id });
    expect(rest.amountCents).toBe(150_000);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe("REFUNDED");
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).paidCents).toBe(0);

    await expect(refundPayment(admin, { paymentId: payment.id, amountCents: 1 })).rejects.toThrow(
      /Only succeeded payments/,
    );
  });

  it("is idempotent on retry keys and staff-gated", async () => {
    const { payment } = await succeededBooking(100_000);
    const key = unique("refund-idem");
    const first = await refundPayment(admin, { paymentId: payment.id, amountCents: 10_000, idempotencyKey: key });
    const second = await refundPayment(admin, { paymentId: payment.id, amountCents: 10_000, idempotencyKey: key });
    expect(second.id).toBe(first.id);
    expect(mockProvider.calls.refund).toBeGreaterThanOrEqual(1);
    await expect(refundPayment(null, { paymentId: payment.id })).rejects.toThrow(UnauthorizedError);
  });
});

describe("visibility and receipts", () => {
  it("restricts reads and issues receipts for successes only", async () => {
    const booking = await paidBooking();
    const payment = await createPayment(null, guestArgs(booking, { amountCents: 150_000 }));
    await expect(receiptData(null, payment.id, booking.customerEmail)).rejects.toThrow(PaymentError);
    await expect(getPayment(null, payment.id, "wrong@example.com")).rejects.toThrow(ForbiddenError);
    const mine = await getPayment(null, payment.id, booking.customerEmail);
    expect(mine.id).toBe(payment.id);
    await applyWebhookEvent("mock", { type: "succeeded", providerRef: payment.providerRef as string });
    const receipt = await receiptData(null, payment.id, booking.customerEmail);
    expect(receipt).toMatchObject({ bookingReference: booking.reference, amountCents: 150_000 });
    expect((await listPayments(admin)).length).toBeGreaterThan(0);
    await expect(listPayments(null)).rejects.toThrow(UnauthorizedError);
  });
});

describe("provider registry", () => {
  it("keeps production providers disabled without credentials", async () => {
    const booking = await paidBooking();
    await expect(
      createPayment(null, guestArgs(booking, { amountCents: 1000, provider: "mpesa" })),
    ).rejects.toThrow(/not configured/);
    await expect(
      createPayment(null, guestArgs(booking, { amountCents: 1000, provider: "nope" })),
    ).rejects.toThrow(/Unknown payment provider/);
  });
});
export function hmacForTest(body: string): string {
  return createHmac("sha256", process.env.MOCK_PROVIDER_SECRET ?? "test-secret").update(body).digest("hex");
}
