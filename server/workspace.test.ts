import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { modifyBooking } from "@/server/bookings";
import { addServiceLine, updateServiceLine } from "@/server/marketplace-pricing";
import { createSupplier, createSupplierRate, createSupplierLock } from "@/server/suppliers";
import { bookingTimeline, bookingWorkspace, inboxCounts, listStaff } from "@/server/workspace";
import { createTestUser, testActor, unique } from "@/tests/db";
import { createBooking } from "@/server/bookings";

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
  await prisma.supplierType.upsert({
    where: { slug: "airport-transfer" },
    update: { active: true },
    create: { slug: "airport-transfer", name: "Airport pickup / transfer", active: true },
  });
});

async function workspaceBooking() {
  return createBooking(null, {
    customerName: "Workspace Guest",
    customerEmail: `${unique("ws")}@example.com`,
    travelStart: "2027-12-01T00:00:00Z",
    travelEnd: "2027-12-08T00:00:00Z",
    adults: 2,
  });
}

async function workspaceSupplier() {
  const suffix = unique("wsup");
  const supplier = await createSupplier(admin, {
    name: `Workspace Supplier ${suffix}`,
    typeSlugs: ["airport-transfer"],
    coverageAreas: ["Nairobi"],
    rating: 5,
  });
  const rate = await createSupplierRate(admin, supplier.id, {
    serviceName: `Workspace transfer ${suffix}`,
    serviceType: "airport-transfer",
    unit: "PER_TRANSFER",
    currency: "USD",
    costCents: 4_000,
    capacity: 10,
  });
  return { supplier, rate };
}

describe("booking workspace", () => {
  it("loads all ten sections in one call", async () => {
    const booking = await workspaceBooking();
    const { supplier, rate } = await workspaceSupplier();
    const line = await addServiceLine(admin, booking.id, {
      serviceName: "JKIA pickup",
      serviceType: "airport-transfer",
      supplierId: supplier.id,
      rateId: rate.id,
      unit: "PER_TRANSFER",
      startsAt: "2027-12-01T06:00:00Z",
      endsAt: "2027-12-01T08:00:00Z",
      location: "Nairobi",
    });
    const lock = await createSupplierLock(admin, {
      rateId: rate.id,
      bookingRef: booking.reference,
      serviceRef: `${booking.reference}-S${line.seq}`,
      startsAt: "2027-12-01T06:00:00Z",
      endsAt: "2027-12-01T08:00:00Z",
    });
    const view = await bookingWorkspace(admin, booking.id);
    expect(view.booking.reference).toBe(booking.reference);
    expect(view.pricing.lines).toHaveLength(1);
    expect(view.pricing.lines[0]?.supplierId).toBe(supplier.id);
    expect(view.locks.map((l) => l.id)).toContain(lock.id);
    expect(view.timeline.length).toBeGreaterThanOrEqual(3);
    expect(view.paidCents).toBe(0);
    expect(view.pastBookings).toEqual([]);
  });

  it("merges status, audit, messages, notes and payments in order", async () => {
    const booking = await workspaceBooking();
    await prisma.customerMessage.create({
      data: { bookingId: booking.id, authorRole: "customer", body: "Can we add a balloon flight?" },
    });
    await prisma.internalNote.create({
      data: { bookingId: booking.id, authorId: null, body: "Client is price-sensitive." },
    });
    const timeline = await bookingTimeline(admin, booking.id);
    const kinds = timeline.map((entry) => entry.kind);
    expect(kinds[0]).toBe("status");
    expect(kinds).toContain("message");
    expect(kinds).toContain("note");
    const message = timeline.find((entry) => entry.kind === "message");
    expect(message?.detail).toContain("balloon flight");
    const ats = timeline.map((entry) => entry.at);
    expect([...ats].sort()).toEqual(ats);
  });

  it("assigns owners and priorities, rejecting customers", async () => {
    const booking = await workspaceBooking();
    const staffer = await createTestUser(`${unique("staff")}@example.com`, "RESERVATION_STAFF");
    const updated = await modifyBooking(admin, booking.id, {
      assignedAdminId: staffer.id,
      priority: "HIGH",
      reason: "VIP lead",
    });
    expect(updated.assignedAdminId).toBe(staffer.id);
    expect(updated.priority).toBe("HIGH");
    const customer = await createTestUser(`${unique("cust")}@example.com`, "CUSTOMER");
    await expect(modifyBooking(admin, booking.id, { assignedAdminId: customer.id })).rejects.toThrow();
    const staff = await listStaff(admin);
    expect(staff.some((s) => s.id === staffer.id)).toBe(true);
    expect(staff.some((s) => s.id === customer.id)).toBe(false);
  });
});

describe("service line updates", () => {
  it("reprices on quantity and supplier changes", async () => {
    const booking = await workspaceBooking();
    const { supplier, rate } = await workspaceSupplier();
    const line = await addServiceLine(admin, booking.id, {
      serviceName: "Flexible transfer",
      serviceType: "airport-transfer",
      costCents: 10_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    expect(line.markupSource).toBe("GLOBAL");
    // Custom line: quantity does not rescale the explicit total.
    const same = await updateServiceLine(admin, line.id, { quantity: 2 });
    expect(same.costCents).toBe(10_000);
    // Assigning a rate re-costs from the card: 2 × 4_000 + 25%.
    const recosted = await updateServiceLine(admin, line.id, {
      supplierId: supplier.id,
      rateId: rate.id,
    });
    expect(recosted.costCents).toBe(8_000);
    expect(recosted.clientPriceCents).toBe(10_000);
    expect(recosted.markupSource).toBe("GLOBAL");
    // Line override wins on update too.
    const overridden = await updateServiceLine(admin, line.id, { lineMarkupBps: 1000 });
    expect(overridden.markupSource).toBe("LINE");
    expect(overridden.clientPriceCents).toBe(8_800);
  });

  it("validates dates and lock ownership", async () => {
    const booking = await workspaceBooking();
    const line = await addServiceLine(admin, booking.id, {
      serviceName: "Dated service",
      serviceType: "airport-transfer",
      costCents: 5_000,
      currency: "USD",
      unit: "PER_TRANSFER",
      startsAt: "2027-12-02T06:00:00Z",
      endsAt: "2027-12-02T08:00:00Z",
      location: "Nairobi",
    });
    await expect(
      updateServiceLine(admin, line.id, { startsAt: "2027-12-03T06:00:00Z", endsAt: "2027-12-02T06:00:00Z" }),
    ).rejects.toThrow();
    await expect(updateServiceLine(admin, line.id, { lockId: "c12345678901234567890123" })).rejects.toThrow();
  });
});

describe("inbox counters", () => {
  it("counts needs-action buckets", async () => {
    const counts = await inboxCounts(admin);
    expect(counts.newRequests).toBeGreaterThanOrEqual(1);
    expect(counts).toHaveProperty("quotesAwaiting");
    expect(counts).toHaveProperty("supplierReplies");
    expect(counts).toHaveProperty("paymentsOverdue");
    expect(Array.isArray(counts.tripsSoon)).toBe(true);
  });
});
