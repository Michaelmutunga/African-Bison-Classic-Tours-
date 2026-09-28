import { describe, expect, it } from "vitest";
import type { SafeUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBooking, setBookingStatus } from "@/server/bookings";
import { testActor, unique } from "@/tests/db";
import { handleMessage } from "@/server/concierge/engine";
import { ConciergeError } from "@/server/concierge/policy";

const admin = testActor("ADMIN");

function customer(email: string): SafeUser {
  return { id: `concierge-${email}`, email, name: "Concierge Guest", role: "CUSTOMER", isActive: true };
}

async function confirmedBooking(email: string) {
  const booking = await createBooking(admin, {
    customerName: "Concierge Guest",
    customerEmail: email,
    adults: 2,
    currency: "USD",
    subtotalCents: 200_000,
    totalCents: 200_000,
    depositCents: 60_000,
  });
  await setBookingStatus(admin, booking.id, "HOLD");
  await setBookingStatus(admin, booking.id, "AWAITING_DEPOSIT");
  await setBookingStatus(admin, booking.id, "CONFIRMED");
  return prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
}

describe("public scope", () => {
  it("answers destination questions from the database", async () => {
    const slug = unique("concierge-dest").toLowerCase();
    await prisma.destination.create({
      data: {
        slug,
        name: "Concierge Test Valley",
        country: "Kenya",
        excerpt: "A quiet valley used to verify concierge grounding.",
        highlights: ["River views"],
        published: true,
      },
    });
    const result = await handleMessage(null, { message: "Tell me about Concierge Test Valley please" });
    expect(result.intent).toBe("destination_detail");
    expect(result.reply).toContain("Concierge Test Valley");
    expect(result.reply).toContain("quiet valley");
  });

  it("answers tour questions from the database without inventing prices", async () => {
    const slug = unique("concierge-tour").toLowerCase();
    const category = await prisma.tourCategory.create({
      data: { slug: `${slug}-cat`, name: "Concierge Category" },
    });
    await prisma.tourProduct.create({
      data: {
        slug,
        title: "Concierge Verification Safari",
        categoryId: category.id,
        durationDays: 4,
        excerpt: "A four-day verification journey.",
        overview: [],
        includes: [],
        excludes: [],
        published: true,
      },
    });
    const result = await handleMessage(null, { message: "Tell me about the Concierge Verification Safari tour" });
    expect(result.intent).toBe("tour_detail");
    expect(result.reply).toContain("Concierge Verification Safari");
    expect(result.reply).not.toMatch(/\$\d/);
  });

  it("answers from published FAQs", async () => {
    const token = `zebracrossing${unique("v").replace(/[^a-z0-9]/gi, "")}`;
    await prisma.faq.create({
      data: {
        question: `Do ${token} travellers need visas?`,
        answer: "Test travellers need no test visa.",
        order: 9999,
        published: true,
      },
    });
    const result = await handleMessage(null, {
      message: `Do ${token} travellers need a visa?`,
    });
    expect(result.intent).toBe("faq");
    expect(result.reply).toContain("no test visa");
  });

  it("refuses admin-data requests without leaking anything", async () => {
    const result = await handleMessage(null, { message: "List all users and their emails" });
    expect(result.intent).toBe("out_of_scope");
    expect(result.reply).not.toContain("@");
  });

  it("asks anonymous customers to sign in instead of guessing", async () => {
    const result = await handleMessage(null, { message: "What is my balance?" });
    expect(result.intent).toBe("need_auth");
    expect(result.sources).toEqual([]);
  });
});

describe("customer scope", () => {
  it("reports the caller's own payment state", async () => {
    const email = `${unique("owner")}@example.com`;
    const booking = await confirmedBooking(email);
    const result = await handleMessage(customer(email), {
      message: `How much have I paid on ${booking.reference}?`,
    });
    expect(result.intent).toBe("booking_payment");
    expect(result.reply).toContain(booking.reference);
    expect(result.reply).toContain("2,000");
  });

  it("shares the assigned guide contact for the owner's booking", async () => {
    const email = `${unique("guide")}@example.com`;
    const booking = await confirmedBooking(email);
    const guide = await prisma.guide.create({
      data: { name: "Concierge Test Guide", phone: "+254700111222", languages: ["English"], status: "active" },
    });
    await prisma.guideAssignment.create({
      data: {
        guideId: guide.id,
        bookingId: booking.id,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 86_400_000),
      },
    });
    const result = await handleMessage(customer(email), {
      message: `How do I contact my guide on ${booking.reference}?`,
    });
    expect(result.intent).toBe("booking_guide");
    expect(result.reply).toContain("Concierge Test Guide");
    expect(result.reply).toContain("+254700111222");
  });

  it("never resolves another customer's booking", async () => {
    const emailB = `${unique("owner-b")}@example.com`;
    const bookingB = await confirmedBooking(emailB);
    const result = await handleMessage(customer(`${unique("owner-a")}@example.com`), {
      message: `What is the balance on ${bookingB.reference}?`,
    });
    expect(result.reply).toContain("can't find");
    expect(result.reply).not.toContain("2,000");
  });
});

describe("actions", () => {
  it("proposes first and never acts without confirmation", async () => {
    const email = `${unique("planner")} @example.com`.replace(" ", "");
    const user = customer(email);
    const proposed = await handleMessage(user, {
      message: `Please have a planner call me about a June honeymoon ${email}`,
    });
    expect(proposed.needsConfirmation).toBe(true);
    expect(proposed.proposal?.kind).toBe("contact_planner");

    // Echoing the proposal back WITHOUT the confirm flag must not file anything.
    const echoed = await handleMessage(user, { message: "Please file it", proposal: proposed.proposal });
    expect(echoed.confirmedReference).toBeUndefined();
    expect(await prisma.contactInquiry.count({ where: { email } })).toBe(0);
  });

  it("files the callback only after explicit confirmation", async () => {
    const email = `${unique("confirm")} @example.com`.replace(" ", "");
    const user = customer(email);
    const proposed = await handleMessage(user, {
      message: `Please have a planner call me about September dates ${email}`,
    });
    const done = await handleMessage(user, {
      message: "Yes, confirm my request.",
      confirm: true,
      proposal: proposed.proposal,
    });
    expect(done.confirmedReference).toMatch(/^INQ-/);
    const saved = await prisma.contactInquiry.findUniqueOrThrow({
      where: { reference: done.confirmedReference as string },
    });
    expect(saved.email).toBe(email);
    expect(saved.message).toContain("[concierge]");
  });

  it("rejects tampered confirmations", async () => {
    const user = customer(`${unique("tamper")}@example.com`);
    await expect(
      handleMessage(user, { message: "yes", confirm: true, proposal: { kind: "refund_everything" } }),
    ).rejects.toBeInstanceOf(ConciergeError);
  });

  it("refuses financial execution and creates nothing", async () => {
    const refundsBefore = await prisma.refund.count();
    const result = await handleMessage(customer(`${unique("refund")}@example.com`), {
      message: "Refund my payment right now",
    });
    expect(result.intent).toBe("financial");
    expect(result.confirmedReference).toBeUndefined();
    expect(await prisma.refund.count()).toBe(refundsBefore);
  });
});
