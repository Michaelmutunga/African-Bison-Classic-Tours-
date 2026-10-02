import { describe, expect, it, beforeAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { BookingError, cancelBooking, setBookingStatus } from "@/server/bookings";
import { NotFoundError } from "@/server/catalogue";
import { submitMarketplaceBooking } from "@/server/submissions";
import { createTestUser, testActor, unique } from "@/tests/db";

const admin = testActor("ADMIN");

function tourSubmission(overrides: Record<string, unknown> = {}) {
  return {
    customerName: "Submission Guest",
    customerEmail: `${unique("sub")}@example.com`,
    customerPhone: "+254700111222",
    nationality: "Kenyan",
    travelStart: "2027-11-01T00:00:00Z",
    travelEnd: "2027-11-08T00:00:00Z",
    adults: 2,
    children: 1,
    childrenAges: [7],
    accommodationTier: "mid-range",
    budgetRange: "$5,000 – $10,000",
    interests: ["Wildlife", "Photography"],
    pickupLocation: "JKIA Terminal 1A",
    contactChannel: "whatsapp",
    ...overrides,
  };
}

beforeAll(async () => {
  await prisma.siteSetting.upsert({
    where: { key: "business.email" },
    update: { value: "staff@example.com" },
    create: { key: "business.email", value: "staff@example.com" },
  });
});

describe("marketplace submissions", () => {
  it("creates a NEW tour booking with reference and notifies both sides", async () => {
    const booking = await submitMarketplaceBooking(null, tourSubmission());
    expect(booking.status).toBe("NEW");
    expect(booking.reference).toMatch(/^ABCT-\d{4}-\d{2}-\d{2}-\d{3,}$/);
    expect(booking.source).toBe("TOUR");
    expect(booking.nationality).toBe("Kenyan");
    expect(booking.childrenAges).toEqual([7]);
    expect(booking.contactChannel).toBe("whatsapp");

    const notes = await prisma.notification.findMany({ where: { bookingId: booking.id } });
    const clientMail = notes.find((n) => n.event === "submission.received" && n.channel === "EMAIL");
    expect(clientMail?.toAddress).toBe(booking.customerEmail);
    expect(clientMail?.subject).toContain(booking.reference);
    expect(clientMail?.body).toContain(booking.reference);
    const staffMail = notes.find((n) => n.event === "submission.staff-alert" && n.channel === "EMAIL");
    expect(staffMail?.toAddress).toBe("staff@example.com");
    expect(staffMail?.body).toContain(booking.reference);
    expect(notes.some((n) => n.event === "submission.staff-alert" && n.channel === "IN_APP")).toBe(true);
    // History starts at NEW.
    const history = await prisma.bookingStatusHistory.findMany({ where: { bookingId: booking.id } });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ from: null, to: "NEW" });
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("links the account of a logged-in customer", async () => {
    const email = `${unique("member")}@example.com`;
    const user = await createTestUser(email, "CUSTOMER");
    const booking = await submitMarketplaceBooking(
      { id: user.id, role: "CUSTOMER" },
      tourSubmission({ customerEmail: email }),
    );
    expect(booking.userId).toBe(user.id);
    await cancelBooking(admin, booking.id, "cleanup");
  });

  it("accepts custom designs with destinations or notes", async () => {
    const byDestinations = await submitMarketplaceBooking(null, {
      ...tourSubmission(),
      source: "CUSTOM",
      customItinerary: { destinations: ["Maasai Mara", "Diani"], travelStyle: "private" },
    });
    expect(byDestinations.source).toBe("CUSTOM");
    await cancelBooking(admin, byDestinations.id, "cleanup");

    const byNotes = await submitMarketplaceBooking(null, {
      ...tourSubmission(),
      source: "CUSTOM",
      customItinerary: { notes: "Combine Amboseli, Maasai Mara and Zanzibar slowly." },
    });
    expect(byNotes.source).toBe("CUSTOM");
    await cancelBooking(admin, byNotes.id, "cleanup");

    await expect(
      submitMarketplaceBooking(null, { ...tourSubmission(), source: "CUSTOM" }),
    ).rejects.toThrow(BookingError);
    await expect(
      submitMarketplaceBooking(null, {
        ...tourSubmission(),
        source: "CUSTOM",
        customItinerary: { notes: "short" },
      }),
    ).rejects.toThrow(BookingError);
  });

  it("resolves public tour slugs and rejects unknown ones", async () => {
    const tour = await prisma.tourProduct.findFirst({ where: { published: true }, select: { id: true, slug: true } });
    expect(tour).toBeTruthy();
    const booking = await submitMarketplaceBooking(null, {
      ...tourSubmission(),
      tourSlug: tour?.slug as string,
    });
    expect(booking.tourId).toBe(tour?.id);
    await cancelBooking(admin, booking.id, "cleanup");
    await expect(
      submitMarketplaceBooking(null, { ...tourSubmission(), tourSlug: "no-such-tour" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("does not re-notify on idempotent retries", async () => {
    const key = unique("subkey");
    const first = await submitMarketplaceBooking(null, { ...tourSubmission(), idempotencyKey: key });
    const second = await submitMarketplaceBooking(null, {
      ...tourSubmission(),
      customerName: "Someone Else",
      idempotencyKey: key,
    });
    expect(second.id).toBe(first.id);
    const clientMails = await prisma.notification.findMany({
      where: { bookingId: first.id, event: "submission.received", channel: "EMAIL" },
    });
    expect(clientMails).toHaveLength(1);
    await cancelBooking(admin, first.id, "cleanup");
  });

  it("supports the NEW stage in the state machine", async () => {
    const booking = await submitMarketplaceBooking(null, tourSubmission());
    await expect(setBookingStatus(admin, booking.id, "CONFIRMED")).rejects.toThrow(BookingError);
    await setBookingStatus(admin, booking.id, "IN_REVIEW", "reviewing");
    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(fresh.status).toBe("IN_REVIEW");
  });
});
