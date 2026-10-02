import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createBooking, cancelBooking, setBookingStatus } from "@/server/bookings";
import { updateServiceLine } from "@/server/marketplace-pricing";
import { createSupplier, createSupplierRate } from "@/server/suppliers";
import {
  WorkflowError,
  acceptQuote,
  expireQuoteVersions,
  generateQuoteDraft,
  proposeServiceLines,
  quoteExpiryWarnings,
  requestQuoteRevision,
  requestSupplierAvailability,
  respondToSupplierRequest,
  saveQuoteVersion,
  sendPreTripReminders,
  sendQuote,
  approveQuote,
} from "@/server/workflow";
import { createPayment, applyWebhookEvent } from "@/server/payments";
import { mockProvider } from "@/server/payments/providers";
import { createTestUser, testActor, unique } from "@/tests/db";

const admin = testActor("ADMIN");

beforeAll(async () => {
  await prisma.markupRule.upsert({
    where: { scope_scopeKey: { scope: "GLOBAL", scopeKey: "" } },
    update: { mode: "PERCENT", percentBps: 2500, fixedCents: null, active: true },
    create: { scope: "GLOBAL", scopeKey: "", mode: "PERCENT", percentBps: 2500, currency: "USD", active: true },
  });
  await prisma.siteSetting.upsert({
    where: { key: "pricing.roundingIncrementCents" },
    update: { value: "1" },
    create: { key: "pricing.roundingIncrementCents", value: "1" },
  });
  await prisma.siteSetting.upsert({
    where: { key: "business.email" },
    update: { value: "staff@example.com" },
    create: { key: "business.email", value: "staff@example.com" },
  });
  await prisma.supplierType.upsert({
    where: { slug: "airport-transfer" },
    update: { active: true },
    create: { slug: "airport-transfer", name: "Airport pickup / transfer", active: true },
  });
  process.env.MOCK_PROVIDER_SECRET = "test-secret";
});

async function flowBooking(email?: string) {
  return createBooking(null, {
    customerName: "Workflow Guest",
    customerEmail: email ?? `${unique("flow")}@example.com`,
    travelStart: "2027-10-01T00:00:00Z",
    travelEnd: "2027-10-05T00:00:00Z",
    adults: 2,
    airport: "Nairobi",
  });
}

async function flowSupplier(kind = "transfer") {
  const suffix = unique("fsup");
  const supplier = await createSupplier(admin, {
    name: `Flow Supplier ${suffix}`,
    typeSlugs: ["airport-transfer"],
    contactPerson: "Flow Contact",
    email: `${suffix}@example.com`,
    coverageAreas: ["Nairobi"],
    rating: 5,
  });
  const rate = await createSupplierRate(admin, supplier.id, {
    serviceName: `Flow ${kind} ${suffix}`,
    serviceType: "airport-transfer",
    unit: "PER_TRANSFER",
    currency: "USD",
    costCents: 4_000,
    capacity: 10,
  });
  return { supplier, rate };
}

async function costedBooking() {
  const booking = await flowBooking();
  const { lines } = await proposeServiceLines(admin, booking.id);
  expect(lines.length).toBeGreaterThanOrEqual(2);
  const { supplier, rate } = await flowSupplier();
  for (const line of lines) {
    await updateServiceLine(admin, line.id, { supplierId: supplier.id, rateId: rate.id });
  }
  return { booking, supplier, rate };
}

function settle(payment: { providerRef: string | null }) {
  const envelope = JSON.parse(mockProvider.settle(payment.providerRef as string, "succeeded")) as { body: string };
  return mockProvider.parseWebhookEvent(envelope.body);
}

describe("full marketplace lifecycle", () => {
  it("runs NEW to COMPLETED with money, locks and payouts", async () => {
    mockProvider.reset();
    const email = `${unique("lifecycle")}@example.com`;
    const member = await createTestUser(email, "CUSTOMER");
    const booking = await flowBooking(email);
    expect(booking.status).toBe("NEW");

    const { lines } = await proposeServiceLines(admin, booking.id);
    const inReview = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(inReview.status).toBe("IN_REVIEW");

    const { supplier, rate } = await flowSupplier();
    for (const line of lines) {
      await updateServiceLine(admin, line.id, { supplierId: supplier.id, rateId: rate.id });
    }
    const requested = await requestSupplierAvailability(admin, booking.id, {});
    expect(requested.locks).toHaveLength(lines.length);
    expect(requested.locks.every((l) => l.emailed)).toBe(true);
    const pending = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(pending.status).toBe("SUPPLIERS_PENDING");

    for (const lock of requested.locks) {
      const answer = await respondToSupplierRequest(lock.token, { action: "accept" });
      expect(answer.status).toBe("HELD");
    }
    // Double-use of a token is rejected.
    await expect(respondToSupplierRequest(requested.locks[0]?.token as string, { action: "accept" })).rejects.toThrow();

    const { version, diff } = await generateQuoteDraft(admin, booking.id);
    expect(version.version).toBe(1);
    expect(version.status).toBe("DRAFT");
    expect(diff.added.length).toBe(lines.length);
    expect(version.totalCents).toBeGreaterThan(0);
    const quoted = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(quoted.status).toBe("QUOTE_DRAFT");

    await approveQuote(admin, booking.id);
    const sent = await sendQuote(admin, booking.id);
    expect(sent.status).toBe("SENT");
    const clientMail = await prisma.notification.findFirst({
      where: { bookingId: booking.id, event: "quote.sent", channel: "EMAIL" },
    });
    expect(clientMail?.subject).toContain(`${booking.reference}-Q1`);

    const accepted = await acceptQuote(member, booking.reference);
    expect(accepted.status).toBe("AWAITING_PAYMENT");
    expect(accepted.totalCents).toBe(sent.totalCents);

    const deposit = await createPayment(null, { bookingId: booking.id, email, amountCents: sent.depositCents, kind: "DEPOSIT" });
    await applyWebhookEvent("mock", settle(deposit));
    const partial = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(partial.status).toBe("PARTIALLY_PAID");

    const balance = await createPayment(null, { bookingId: booking.id, email, amountCents: sent.totalCents - sent.depositCents, kind: "BALANCE" });
    const applied = await applyWebhookEvent("mock", settle(balance));
    expect(applied.applied).toBe(true);
    const confirmed = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(confirmed.status).toBe("CONFIRMED");

    const confirmedLocks = await prisma.supplierLock.findMany({ where: { bookingRef: booking.reference } });
    expect(confirmedLocks.every((l) => l.status === "CONFIRMED")).toBe(true);
    const payouts = await prisma.supplierPayout.findMany({ where: { bookingRef: booking.reference } });
    expect(payouts.length).toBe(lines.length);
    expect(payouts.every((p) => p.status === "DUE")).toBe(true);
    const voucher = await prisma.document.findFirst({ where: { bookingId: booking.id, kind: "voucher" } });
    expect(voucher?.title).toContain(booking.reference);

    await setBookingStatus(admin, booking.id, "IN_PROGRESS", "wheels up");
    await setBookingStatus(admin, booking.id, "COMPLETED", "karibu back");
    const done = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(done.status).toBe("COMPLETED");
  }, 60_000);
});

describe("supplier responses", () => {
  it("records counters and declines with staff alerts", async () => {
    const { booking } = await costedBooking();
    const requested = await requestSupplierAvailability(admin, booking.id, {});
    const [first, second] = requested.locks;
    const counter = await respondToSupplierRequest(first?.token as string, {
      action: "counter",
      amountCents: 5_000,
      currency: "USD",
      note: "Fuel surcharge season",
    });
    expect(counter.status).toBe("REQUESTED");
    expect(counter.counterOfferCents).toBe(5_000);
    const declined = await respondToSupplierRequest(second?.token as string, { action: "decline", note: "Fully booked" });
    expect(declined.status).toBe("DECLINED");
    const alerts = await prisma.notification.findMany({
      where: { event: "supplier.responded", channel: "EMAIL" },
    });
    expect(alerts.length).toBeGreaterThanOrEqual(2);
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("rejects responses on settled locks", async () => {
    const { booking } = await costedBooking();
    const requested = await requestSupplierAvailability(admin, booking.id, {});
    const token = requested.locks[0]?.token as string;
    await respondToSupplierRequest(token, { action: "decline" });
    // Token already consumed.
    await expect(respondToSupplierRequest(token, { action: "accept" })).rejects.toThrow();
    await cancelBooking(admin, booking.id, "cleanup");
  });
});

describe("quote revisions and versions", () => {
  it("loops SENT -> CLIENT_REVISION -> DRAFT with diffs", async () => {
    const email = `${unique("revise")}@example.com`;
    const member = await createTestUser(email, "CUSTOMER");
    const raw = await flowBooking(email);
    const { booking } = await (async () => {
      const { lines } = await proposeServiceLines(admin, raw.id);
      const { supplier, rate } = await flowSupplier();
      for (const line of lines) await updateServiceLine(admin, line.id, { supplierId: supplier.id, rateId: rate.id });
      await requestSupplierAvailability(admin, raw.id, {});
      const locks = await prisma.supplierLock.findMany({ where: { bookingRef: raw.reference } });
      for (const lock of locks) await prisma.supplierLock.update({ where: { id: lock.id }, data: { status: "HELD" } });
      await generateQuoteDraft(admin, raw.id);
      await approveQuote(admin, raw.id);
      await sendQuote(admin, raw.id);
      return { booking: raw };
    })();
    await requestQuoteRevision(member, booking.reference, { comments: "Please swap the last night to mid-range." });
    const revised = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(revised.status).toBe("CLIENT_REVISION");

    const { version, diff } = await saveQuoteVersion(admin, booking.id, { discountCents: 5_000, notes: "Mid-range swap applied" });
    expect(version.version).toBe(2);
    expect(diff.discountChanged).toBe(true);
    expect(version.discountCents).toBe(5_000);
    await approveQuote(admin, booking.id);
    const resent = await sendQuote(admin, booking.id);
    expect(resent.version).toBe(2);
    const accepted = await acceptQuote(member, booking.reference);
    expect(accepted.status).toBe("AWAITING_PAYMENT");
    expect(accepted.discountCents).toBe(5_000);
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("refuses drafts without held suppliers", async () => {
    const booking = await flowBooking();
    await proposeServiceLines(admin, booking.id);
    await expect(generateQuoteDraft(admin, booking.id)).rejects.toThrow(WorkflowError);
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("rejects illegal quote transitions", async () => {
    const booking = await flowBooking();
    await expect(approveQuote(admin, booking.id)).rejects.toThrow(WorkflowError);
    await expect(sendQuote(admin, booking.id)).rejects.toThrow(WorkflowError);
    await cancelBooking(admin, booking.id, "cleanup");
  });
});

describe("expiry, warnings and reminders", () => {
  it("expires lapsed quotes and releases held locks", async () => {
    const { booking } = await costedBooking();
    const requested = await requestSupplierAvailability(admin, booking.id, {});
    for (const lock of requested.locks) {
      await respondToSupplierRequest(lock.token, { action: "accept" });
    }
    const { version } = await generateQuoteDraft(admin, booking.id);
    await approveQuote(admin, booking.id);
    await sendQuote(admin, booking.id);
    await prisma.quoteVersion.update({ where: { id: version.id }, data: { validUntil: new Date("2020-01-01T00:00:00Z") } });
    const result = await expireQuoteVersions(new Date("2021-01-01T00:00:00Z"));
    expect(result.versions).toBeGreaterThanOrEqual(1);
    const locks = await prisma.supplierLock.findMany({ where: { bookingRef: booking.reference } });
    expect(locks.every((l) => l.status === "RELEASED")).toBe(true);
    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(fresh.status).toBe("EXPIRED");
  });

  it("warns before SENT quotes lapse", async () => {
    const { booking } = await costedBooking();
    const requested = await requestSupplierAvailability(admin, booking.id, {});
    for (const lock of requested.locks) {
      await respondToSupplierRequest(lock.token, { action: "accept" });
    }
    await generateQuoteDraft(admin, booking.id);
    await approveQuote(admin, booking.id);
    const sent = await sendQuote(admin, booking.id);
    await prisma.quoteVersion.update({
      where: { id: sent.id },
      data: { validUntil: new Date(Date.now() + 24 * 3600_000) },
    });
    const warned = await quoteExpiryWarnings(new Date());
    expect(warned).toBeGreaterThanOrEqual(1);
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("reminds clients and suppliers before travel", async () => {
    const start = new Date(Date.now() + 7 * 86_400_000);
    const booking = await createBooking(null, {
      customerName: "Reminder Guest",
      customerEmail: `${unique("remind")}@example.com`,
      travelStart: start.toISOString(),
      travelEnd: new Date(start.getTime() + 3 * 86_400_000).toISOString(),
      adults: 2,
    });
    for (const status of ["IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "AWAITING_PAYMENT", "CONFIRMED"] as const) {
      await setBookingStatus(admin, booking.id, status);
    }
    const reminders = await sendPreTripReminders(new Date());
    expect(reminders.sevenDay).toBeGreaterThanOrEqual(1);
    await cancelBooking(admin, booking.id, "cleanup");
  });
});

describe("cancellation releases supplier locks", () => {
  it("frees REQUESTED and HELD commitments", async () => {
    const { booking } = await costedBooking();
    const requested = await requestSupplierAvailability(admin, booking.id, {});
    await respondToSupplierRequest(requested.locks[0]?.token as string, { action: "accept" });
    await cancelBooking(admin, booking.id, "guest cancelled");
    const locks = await prisma.supplierLock.findMany({ where: { bookingRef: booking.reference } });
    expect(locks.every((l) => l.status === "RELEASED")).toBe(true);
  });
});
