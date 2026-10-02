import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { NotFoundError } from "@/server/catalogue";
import { createBooking, setBookingStatus } from "@/server/bookings";
import { testActor, unique } from "@/tests/db";
import {
  PortalError,
  addTraveller,
  attachDocument,
  bookingChecklist,
  journeyProgress,
  listDocuments,
  listMessages,
  listMyBookings,
  postMessage,
  registerCustomer,
  removeTraveller,
  requireBookingAccess,
  tripDayNumber,
  updateTraveller,
} from "@/server/portal";

const admin = testActor("ADMIN");

async function customerWithBooking() {
  const email = `${unique("portal")}@example.com`;
  const booking = await createBooking(null, {
    customerName: "Portal Owner",
    customerEmail: email,
    adults: 2,
    currency: "USD",
    subtotalCents: 100_000,
    totalCents: 100_000,
    depositCents: 30_000,
  });
  const { user, claimedCount } = await registerCustomer({
    name: "Portal Owner",
    email,
    password: "Portal-Password-123!",
  });
  expect(claimedCount).toBe(1);
  const { token } = await createSession(user.id);
  void token;
  const me = { id: user.id, email: user.email, name: user.name, role: user.role, isActive: true };
  return { booking, me, email, user };
}

describe("registration and claim", () => {
  it("registers, links guest bookings and rejects duplicates", async () => {
    const { booking, me } = await customerWithBooking();
    expect(me.role).toBe("CUSTOMER");
    const linked = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(linked.userId).toBe(me.id);
    await expect(
      registerCustomer({ name: "Dup", email: me.email, password: "Portal-Password-123!" }),
    ).rejects.toThrow(/already exists/);
    await expect(
      registerCustomer({ name: "X", email: "bad", password: "short" }),
    ).rejects.toThrow();
    const mine = await listMyBookings(me);
    expect(mine.map((b) => b.id)).toContain(booking.id);
    await prisma.user.delete({ where: { id: me.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

describe("ownership isolation", () => {
  it("hides other customers' bookings as 404", async () => {
    const first = await customerWithBooking();
    const second = await customerWithBooking();
    await expect(requireBookingAccess(second.me, first.booking.reference)).rejects.toThrow(NotFoundError);
    await expect(requireBookingAccess(null, first.booking.reference)).rejects.toThrow();
    // Staff may access for support.
    const seen = await requireBookingAccess({ ...first.me, role: "ADMIN" }, second.booking.reference);
    expect(seen.id).toBe(second.booking.id);
    expect((await listMyBookings(second.me)).map((b) => b.id)).not.toContain(first.booking.id);
    for (const fixture of [first, second]) {
      await prisma.user.delete({ where: { id: fixture.me.id } });
      await prisma.booking.delete({ where: { id: fixture.booking.id } });
    }
  });
});

describe("travellers", () => {
  it("adds, updates and removes with validation", async () => {
    const { booking, me } = await customerWithBooking();
    const traveller = await addTraveller(me, booking.reference, {
      fullName: "Amina Yusuf",
      kind: "adult",
      nationality: "Kenyan",
      passportNumber: "A1234567",
    });
    expect(traveller.fullName).toBe("Amina Yusuf");
    const updated = await updateTraveller(me, traveller.id, { dietaryNotes: "Vegetarian" });
    expect(updated.dietaryNotes).toBe("Vegetarian");
    await expect(addTraveller(me, booking.reference, { fullName: "X" })).rejects.toThrow();
    await removeTraveller(me, traveller.id);
    expect(await prisma.bookingTraveller.findUnique({ where: { id: traveller.id } })).toBeNull();

    // Locked once underway.
    for (const status of ["IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "AWAITING_PAYMENT", "CONFIRMED", "IN_PROGRESS"] as const) {
      await setBookingStatus(admin, booking.id, status);
    }
    await expect(
      addTraveller(me, booking.reference, { fullName: "Late Guest", kind: "adult" }),
    ).rejects.toThrow(PortalError);
    await prisma.user.delete({ where: { id: me.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it("keeps one traveller's data away from other owners", async () => {
    const first = await customerWithBooking();
    const second = await customerWithBooking();
    const traveller = await addTraveller(first.me, first.booking.reference, {
      fullName: "Private Person",
      kind: "adult",
    });
    await expect(updateTraveller(second.me, traveller.id, { fullName: "Hacked" })).rejects.toThrow(
      NotFoundError,
    );
    await expect(removeTraveller(second.me, traveller.id)).rejects.toThrow(NotFoundError);
    for (const fixture of [first, second]) {
      await prisma.user.delete({ where: { id: fixture.me.id } });
      await prisma.booking.delete({ where: { id: fixture.booking.id } });
    }
  });
});

describe("messages", () => {
  it("threads customer and staff messages in order", async () => {
    const { booking, me } = await customerWithBooking();
    await postMessage(me, booking.reference, { body: "What time is pickup?" });
    await prisma.customerMessage.create({
      data: { bookingId: booking.id, authorId: admin.id, authorRole: "staff", body: "6am sharp." },
    });
    const messages = await listMessages(me, booking.reference);
    expect(messages.map((m) => m.body)).toEqual(["What time is pickup?", "6am sharp."]);
    expect(messages.map((m) => m.authorRole)).toEqual(["customer", "staff"]);
    await expect(postMessage(me, booking.reference, { body: "" })).rejects.toThrow();
    await prisma.user.delete({ where: { id: me.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

describe("documents", () => {
  it("lists generated docs plus staff attachments", async () => {
    const { booking, me } = await customerWithBooking();
    const docs = await listDocuments(me, booking.reference);
    expect(docs.map((d) => d.kind)).toContain("confirmation");
    await attachDocument(admin, {
      bookingId: booking.id,
      kind: "voucher",
      title: "Balloon voucher",
      url: "https://example.com/voucher.pdf",
    });
    const updated = await listDocuments(me, booking.reference);
    expect(updated.map((d) => d.title)).toContain("Balloon voucher");
    await prisma.user.delete({ where: { id: me.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

describe("checklist and progress", () => {
  it("derives checklist states from booking facts", () => {
    const base = {
      depositCents: 30_000,
      paidCents: 0,
      totalCents: 100_000,
      adults: 2,
      children: 0,
      travelStart: null,
      travellers: [],
    };
    expect(bookingChecklist(base).every((i) => i.status === "pending")).toBe(true);
    const done = bookingChecklist({
      ...base,
      paidCents: 100_000,
      travelStart: new Date("2027-09-18T06:00:00Z"),
      travellers: [
        { fullName: "Amina Yusuf", nationality: "Kenyan", passportNumber: "A1234567" },
        { fullName: "Brian Otieno", nationality: "Kenyan", passportNumber: "B7654321" },
      ],
    });
    expect(done.every((i) => i.status === "complete")).toBe(true);
  });

  it("maps statuses to journey stages and trip days", () => {
    expect(journeyProgress("IN_PROGRESS")).toMatchObject({ stage: 11, of: 12 });
    expect(journeyProgress("COMPLETED").stage).toBe(12);
    expect(journeyProgress("WEIRD").stage).toBe(0);
    expect(tripDayNumber(new Date("2027-09-18T06:00:00Z"), new Date("2027-09-20T12:00:00Z"))).toBe(3);
    expect(tripDayNumber(null)).toBeNull();
  });
});
