import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import {
  BookingError,
  TRANSITIONS,
  bookingReference,
  cancelBooking,
  createBooking,
  createHold,
  modifyBooking,
  releaseHold,
  renewHold,
  setBookingStatus,
  sweepExpirations,
  getBookingByReference,
} from "@/server/bookings";
import { ConflictError } from "@/server/catalogue";
import { createQuote } from "@/server/pricing";
import { testActor, unique } from "@/tests/db";

const admin = testActor("ADMIN");
const finance = testActor("FINANCE_USER");

const HOLD = {
  resourceType: "vehicle",
  resourceId: "test-cruiser-1",
  quantity: 1,
  startsAt: "2027-09-18T06:00:00Z",
  endsAt: "2027-09-24T18:00:00Z",
  capacity: 1,
  ttlMinutes: 60,
};

async function guestBooking(overrides: Record<string, unknown> = {}) {
  return createBooking(null, {
    customerName: "Test Guest",
    customerEmail: `${unique("guest")}@example.com`,
    travelStart: "2027-09-18T06:00:00Z",
    travelEnd: "2027-09-24T18:00:00Z",
    adults: 2,
    ...overrides,
  });
}

beforeAll(async () => {
  // Failed runs can leave blockers on the shared conflict-test resource.
  await prisma.hold.deleteMany({ where: { resourceId: "test-cruiser-1" } });
});

describe("references and state machine", () => {
  it("generates unique references", () => {
    const refs = new Set([bookingReference(), bookingReference(), bookingReference()]);
    expect(refs.size).toBe(3);
    for (const ref of refs) expect(ref).toMatch(/^ABCT-\d{4}-[A-Z2-9]{6}$/);
  });

  it("rejects illegal transitions", async () => {
    const booking = await guestBooking();
    await expect(setBookingStatus(admin, booking.id, "CONFIRMED")).rejects.toThrow(BookingError);
    await expect(setBookingStatus(admin, booking.id, "COMPLETED")).rejects.toThrow(BookingError);
    // History recorded creation.
    const history = await prisma.bookingStatusHistory.findMany({ where: { bookingId: booking.id } });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ from: null, to: "INQUIRY" });
    await cancelBooking(admin, booking.id, "test cleanup");
  });

  it("walks the legal path with history at every step", async () => {
    const booking = await guestBooking();
    const path = ["HOLD", "AWAITING_DEPOSIT", "CONFIRMED", "PRE_TRIP", "ON_SAFARI", "COMPLETED"] as const;
    for (const status of path) {
      await setBookingStatus(admin, booking.id, status, `moving to ${status}`);
    }
    const history = await prisma.bookingStatusHistory.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: "asc" },
    });
    expect(history.map((h) => h.to)).toEqual(["INQUIRY", ...path]);
    expect(history.every((h) => h.reason !== null)).toBe(true);
  });

  it("expired bookings can re-enter", async () => {
    const booking = await guestBooking();
    await setBookingStatus(admin, booking.id, "EXPIRED");
    await setBookingStatus(admin, booking.id, "INQUIRY", "re-engaged");
    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(fresh.status).toBe("INQUIRY");
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("exposes the full transition map", () => {
    expect(TRANSITIONS.REFUND_PENDING).toEqual(["REFUNDED"]);
    expect(TRANSITIONS.COMPLETED).toEqual([]);
    expect(TRANSITIONS.CANCELLED).toEqual([]);
  });
});

describe("idempotency", () => {
  it("returns the original booking on duplicate keys", async () => {
    const key = unique("idem");
    const first = await guestBooking({ idempotencyKey: key });
    const second = await guestBooking({ idempotencyKey: key, customerName: "Someone Else" });
    expect(second.id).toBe(first.id);
    expect(second.customerName).toBe("Test Guest");
    await cancelBooking(admin, first.id, "cleanup");
  });
});

describe("holds", () => {
  it("enforces capacity and releases on cancel", async () => {
    const booking = await guestBooking();
    const hold = await createHold(admin, { ...HOLD, bookingId: booking.id });
    expect(hold.status).toBe("ACTIVE");
    const other = await guestBooking();
    await expect(createHold(admin, { ...HOLD, bookingId: other.id })).rejects.toThrow(ConflictError);
    await cancelBooking(admin, booking.id, "releasing");
    const released = await prisma.hold.findUniqueOrThrow({ where: { id: hold.id } });
    expect(released.status).toBe("RELEASED");
    // Capacity is free again.
    const retry = await createHold(admin, { ...HOLD, bookingId: other.id });
    expect(retry.status).toBe("ACTIVE");
    await releaseHold(admin, retry.id);
    await cancelBooking(admin, other.id, "cleanup");
  });

  it("consumes holds on confirmation", async () => {
    const booking = await guestBooking({ holds: [{ ...HOLD }] });
    expect(booking.status).toBe("HOLD");
    await setBookingStatus(admin, booking.id, "AWAITING_DEPOSIT");
    await setBookingStatus(admin, booking.id, "CONFIRMED");
    const holds = await prisma.hold.findMany({ where: { bookingId: booking.id } });
    expect(holds.every((h) => h.status === "CONSUMED")).toBe(true);
    // Consumed holds still block inventory.
    const other = await guestBooking();
    await expect(createHold(admin, { ...HOLD, bookingId: other.id })).rejects.toThrow(ConflictError);
    await cancelBooking(admin, other.id, "cleanup");
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("expires holds and strands bookings via sweep", async () => {
    const past = new Date("2020-01-01T00:00:00Z");
    const resourceId = unique("sweep-cruiser");
    const booking = await guestBooking({ holds: [{ ...HOLD, resourceId }] });
    await prisma.hold.updateMany({ where: { bookingId: booking.id }, data: { expiresAt: past } });
    const swept = await sweepExpirations(new Date("2021-01-01T00:00:00Z"));
    expect(swept.holds).toBeGreaterThanOrEqual(1);
    expect(swept.bookings).toBeGreaterThanOrEqual(1);
    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(fresh.status).toBe("EXPIRED");
  });

  it("renews active holds and rejects spent ones", async () => {
    const booking = await guestBooking();
    const resourceId = unique("renew-cruiser");
    const hold = await createHold(admin, { ...HOLD, resourceId, bookingId: booking.id, ttlMinutes: 60 });
    const before = Date.now();
    const renewed = await renewHold(admin, hold.id, 120);
    expect(renewed.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 119 * 60_000);
    expect(renewed.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 121 * 60_000);
    await releaseHold(admin, hold.id);
    await expect(renewHold(admin, hold.id, 120)).rejects.toThrow(BookingError);
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("serializes concurrent holds to capacity", async () => {
    const resourceId = unique("race-cruiser");
    const bookings = await Promise.all([guestBooking(), guestBooking(), guestBooking(), guestBooking(), guestBooking()]);
    const attempts = await Promise.allSettled(
      bookings.map((b) =>
        createHold(admin, { ...HOLD, resourceId, bookingId: b.id, capacity: 2 }),
      ),
    );
    const won = attempts.filter((a) => a.status === "fulfilled");
    const lost = attempts.filter((a) => a.status === "rejected");
    expect(won).toHaveLength(2);
    expect(lost).toHaveLength(3);
    for (const booking of bookings) {
      await cancelBooking(admin, booking.id, "cleanup");
    }
  });
});

describe("modification", () => {
  it("edits details and releases holds on date change", async () => {
    const booking = await guestBooking({ holds: [{ ...HOLD, resourceId: unique("modify-cruiser") }] });
    const updated = await modifyBooking(admin, booking.id, {
      adults: 3,
      customerPhone: "+254700000000",
      reason: "party grew",
    });
    expect(updated.adults).toBe(3);
    expect(updated.customerPhone).toBe("+254700000000");
    // Holds survive non-date edits.
    expect(await prisma.hold.count({ where: { bookingId: booking.id, status: "ACTIVE" } })).toBe(1);
    await modifyBooking(admin, booking.id, {
      travelStart: "2027-10-01T06:00:00Z",
      travelEnd: "2027-10-07T18:00:00Z",
      reason: "moved",
    });
    expect(await prisma.hold.count({ where: { bookingId: booking.id, status: "ACTIVE" } })).toBe(0);
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("refuses edits once confirmed", async () => {
    const booking = await guestBooking();
    await setBookingStatus(admin, booking.id, "HOLD");
    await setBookingStatus(admin, booking.id, "CONFIRMED");
    await expect(modifyBooking(admin, booking.id, { adults: 4 })).rejects.toThrow(BookingError);
    await cancelBooking(admin, booking.id, "cleanup");
  });
});

describe("cancellation and lookup", () => {
  it("routes paid bookings to refunds", async () => {
    const booking = await guestBooking();
    await prisma.booking.update({ where: { id: booking.id }, data: { paidCents: 50_000 } });
    const cancelled = await cancelBooking(admin, booking.id, "guest request");
    expect(cancelled.status).toBe("REFUND_PENDING");
    await setBookingStatus(admin, booking.id, "REFUNDED");
    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(fresh.status).toBe("REFUNDED");
  });

  it("lets guests look up and cancel with their email", async () => {
    const booking = await guestBooking();
    const found = await getBookingByReference(booking.reference, booking.customerEmail);
    expect(found?.id).toBe(booking.id);
    expect(await getBookingByReference(booking.reference, "wrong@example.com")).toBeNull();
    // Staff-only paths reject guests and read-only roles.
    await expect(setBookingStatus(null, booking.id, "CONFIRMED")).rejects.toThrow(UnauthorizedError);
    await expect(setBookingStatus(finance, booking.id, "CONFIRMED")).rejects.toThrow(ForbiddenError);
    await expect(createHold(finance, { ...HOLD, bookingId: booking.id })).rejects.toThrow(ForbiddenError);
    const cancelled = await cancelBooking(null, booking.id, "changed mind", booking.customerEmail);
    expect(cancelled.status).toBe("CANCELLED");
    await expect(cancelBooking(null, booking.id, "again", "wrong@example.com")).rejects.toThrow();
  });
});

describe("quote conversion", () => {
  it("converts accepted quotes with their snapshot", async () => {
    const tier = unique("booking-tier");
    await prisma.rateCard.create({
      data: {
        slug: tier,
        name: "Booking test tier",
        comfortTier: tier,
        transportStyle: null,
        amountCents: 10_000,
        currency: "USD",
        placeholder: false,
      },
    });
    const quote = await createQuote(admin, {
      startDate: "2027-08-10",
      endDate: "2027-08-12",
      adults: 2,
      comfortTier: tier,
    });
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
    const booking = await createBooking(null, {
      customerName: "Quote Guest",
      customerEmail: `${unique("qguest")}@example.com`,
      quoteId: quote.id,
    });
    expect(booking.totalCents).toBe(quote.totalCents);
    expect(booking.status).toBe("INQUIRY");
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("CONVERTED");
    await expect(
      createBooking(null, {
        customerName: "Quote Guest",
        customerEmail: `${unique("qguest")}@example.com`,
        quoteId: quote.id,
      }),
    ).rejects.toThrow(BookingError);
    await cancelBooking(admin, booking.id, "cleanup");
    await prisma.rateCard.deleteMany({ where: { comfortTier: tier } });
  });
});
