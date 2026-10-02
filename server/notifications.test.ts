import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createBooking, setBookingStatus } from "@/server/bookings";
import { testActor, unique } from "@/tests/db";
import { notify, sendBalanceReminders, sendHoldExpiringReminders, sendTripReminders } from "@/server/notifications/dispatch";
import { getEmailProvider, getSmsProvider, getWhatsAppProvider } from "@/server/notifications/providers";
import { templates, type TemplateName } from "@/server/notifications/templates";

const admin = testActor("ADMIN");

describe("templates", () => {
  const names = Object.keys(templates) as TemplateName[];
  it("renders every template without leaking undefined", () => {
    expect(names.length).toBeGreaterThanOrEqual(10);
    for (const name of names) {
      const rendered = templates[name]({
        name: "Test Guest",
        reference: "ABCT-2026-TEST",
        title: "Test Safari",
        amount: "$100.00",
        balance: "$50.00",
        date: "18 September 2027",
        details: ["Detail one.", "Detail two."],
        ctaUrl: "https://example.com/safari",
        ctaLabel: "Open",
      });
      expect(rendered.subject.length, name).toBeGreaterThan(5);
      expect(rendered.html, name).toContain("<html>");
      expect(rendered.text, name).toContain("African Bison");
      expect(`${rendered.subject}${rendered.html}`, name).not.toContain("undefined");
    }
  });
});

describe("dispatcher", () => {
  it("sends email and in-app, then dedupes repeats", async () => {
    const key = unique("dedupe");
    const first = await notify({
      event: "test.event",
      channels: ["EMAIL", "IN_APP"],
      to: { email: "notify-test@example.com" },
      template: { name: "inquiryReceived", input: { name: "Tester", reference: "INQ-1" } },
      dedupeKey: key,
    });
    expect(first.filter((r) => r.status === "SENT")).toHaveLength(2);
    const second = await notify({
      event: "test.event",
      channels: ["EMAIL", "IN_APP"],
      to: { email: "notify-test@example.com" },
      template: { name: "inquiryReceived", input: { name: "Tester", reference: "INQ-1" } },
      dedupeKey: key,
    });
    expect(second.every((r) => r.status === "DUPLICATE")).toBe(true);
    expect(
      await prisma.notification.count({ where: { dedupeKey: { startsWith: key } } }),
    ).toBe(2);
  });

  it("fails closed on unconnected channels without throwing", async () => {
    expect(getWhatsAppProvider().configured()).toBe(false);
    expect(getSmsProvider().configured()).toBe(false);
    const results = await notify({
      event: "test.chat",
      channels: ["WHATSAPP", "SMS"],
      to: { phone: "+254700000000" },
      subject: "Hello",
      body: "Test message",
      dedupeKey: unique("chat"),
    });
    expect(results.every((r) => r.status === "FAILED")).toBe(true);
    const rows = await prisma.notification.findMany({
      where: { event: "test.chat" },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    expect(rows.every((r) => r.status === "FAILED" && !!r.error)).toBe(true);
  });

  it("uses the log provider outside production", async () => {
    expect(getEmailProvider().name).toBe("log");
  });
});

describe("flow wiring", () => {
  async function confirmedBooking() {
    const booking = await createBooking(admin, {
      customerName: "Notify Guest",
      customerEmail: `${unique("notify")}@example.com`,
      adults: 2,
      currency: "USD",
      subtotalCents: 200_000,
      totalCents: 200_000,
      depositCents: 60_000,
    });
    for (const status of ["IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "AWAITING_PAYMENT", "CONFIRMED"] as const) {
      await setBookingStatus(admin, booking.id, status);
    }
    return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
  }

  it("notifies on confirmation", async () => {
    const booking = await confirmedBooking();
    const rows = await prisma.notification.findMany({ where: { bookingId: booking.id } });
    expect(rows.map((r) => r.event)).toContain("booking.confirmed");
    expect(rows.find((r) => r.event === "booking.confirmed")?.status).toBe("SENT");
  });

  it("reminds about trips starting in a week, once each", async () => {
    const start = new Date(Date.now() + 7 * 86_400_000);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    const booking = await createBooking(admin, {
      customerName: "Soon Guest",
      customerEmail: `${unique("soon")}@example.com`,
      travelStart: start.toISOString(),
      travelEnd: end.toISOString(),
      adults: 2,
    });
    await setBookingStatus(admin, booking.id, "IN_REVIEW");
    await setBookingStatus(admin, booking.id, "SUPPLIERS_PENDING");
    await setBookingStatus(admin, booking.id, "QUOTE_DRAFT");
    await setBookingStatus(admin, booking.id, "QUOTE_APPROVED");
    await setBookingStatus(admin, booking.id, "QUOTE_SENT");
    await setBookingStatus(admin, booking.id, "AWAITING_PAYMENT");
    await setBookingStatus(admin, booking.id, "CONFIRMED");
    // Confirmation emails also fired; count only reminders.
    expect(await sendTripReminders(new Date())).toBeGreaterThanOrEqual(1);
    expect(await sendTripReminders(new Date())).toBe(0);
    const rows = await prisma.notification.findMany({
      where: { bookingId: booking.id, event: "trip.reminder" },
    });
    // One row per channel (email + in-app), each idempotent on its own key.
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.channel))).toEqual(new Set(["EMAIL", "IN_APP"]));
  });

  it("notifies on trip start and completion", async () => {
    const booking = await confirmedBooking();
    await setBookingStatus(admin, booking.id, "IN_PROGRESS");
    await setBookingStatus(admin, booking.id, "COMPLETED");
    const rows = await prisma.notification.findMany({ where: { bookingId: booking.id } });
    expect(rows.map((r) => r.event)).toContain("trip.started");
    expect(rows.map((r) => r.event)).toContain("trip.completed");
  });

  it("warns about holds expiring within a day, once each", async () => {
    const booking = await createBooking(admin, {
      customerName: "Hold Guest",
      customerEmail: `${unique("hold")}@example.com`,
      adults: 2,
    });
    await prisma.hold.create({
      data: {
        bookingId: booking.id,
        resourceType: "vehicle",
        resourceId: `LC-${unique("lc")}`,
        quantity: 1,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3 * 86_400_000),
        expiresAt: new Date(Date.now() + 2 * 3_600_000),
        status: "ACTIVE",
      },
    });
    expect(await sendHoldExpiringReminders(new Date())).toBeGreaterThanOrEqual(1);
    expect(await sendHoldExpiringReminders(new Date())).toBe(0);
  });

  it("reminds stale deposits weekly at most", async () => {
    const booking = await createBooking(admin, {
      customerName: "Balance Guest",
      customerEmail: `${unique("balance")}@example.com`,
      adults: 2,
      currency: "USD",
      subtotalCents: 200_000,
      totalCents: 200_000,
      depositCents: 60_000,
    });
    await setBookingStatus(admin, booking.id, "IN_REVIEW");
    await setBookingStatus(admin, booking.id, "SUPPLIERS_PENDING");
    await setBookingStatus(admin, booking.id, "QUOTE_DRAFT");
    await setBookingStatus(admin, booking.id, "QUOTE_APPROVED");
    await setBookingStatus(admin, booking.id, "QUOTE_SENT");
    await setBookingStatus(admin, booking.id, "AWAITING_PAYMENT");
    await prisma.booking.update({
      where: { id: booking.id },
      data: { createdAt: new Date(Date.now() - 5 * 86_400_000) },
    });
    expect(await sendBalanceReminders(new Date())).toBeGreaterThanOrEqual(1);
    expect(await sendBalanceReminders(new Date())).toBe(0);
  });
});
