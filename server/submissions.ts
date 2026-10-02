import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { bookingInput, createBooking } from "@/server/bookings";
import { NotFoundError, type Actor } from "@/server/catalogue";
import { notify } from "@/server/notifications/dispatch";
import { SITE_URL } from "@/server/notifications/templates";

/**
 * Marketplace submissions (Phase 4). Two entries — a listed tour or a
 * custom design — both land as a booking in NEW with a dated reference.
 *
 * On submit: client confirmation email (with reference) + staff alert
 * (in-app, email, optional WhatsApp hook). The client account is the
 * submitter's when logged in; guests stay email-linked and are claimed
 * automatically by the existing register flow — no unusable auto-passwords.
 */

export const submissionInput = bookingInput.extend({
  // Public alias for tourId: resolved to a published tour server-side.
  tourSlug: z.string().trim().max(180).optional(),
});

export type SubmissionInput = z.infer<typeof submissionInput>;

async function businessContact(): Promise<{ email: string | null; phone: string | null }> {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: ["business.email", "business.phonePrimary"] } },
  });
  const get = (key: string) => settings.find((s) => s.key === key)?.value ?? null;
  return { email: get("business.email"), phone: get("business.phonePrimary") };
}

function travelSummary(booking: {
  travelStart: Date | null;
  travelEnd: Date | null;
  flexibleDates: boolean;
  adults: number;
  children: number;
  infants: number;
}): string[] {
  const lines: string[] = [];
  if (booking.travelStart && booking.travelEnd) {
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    lines.push(
      `Travel dates: ${fmt(booking.travelStart)} → ${fmt(booking.travelEnd)}${booking.flexibleDates ? " (flexible)" : ""}.`,
    );
  } else {
    lines.push("Travel dates: to be pinned down with your planner.");
  }
  const party = `${booking.adults} adult${booking.adults === 1 ? "" : "s"}${
    booking.children > 0 ? `, ${booking.children} ${booking.children === 1 ? "child" : "children"}` : ""
  }${booking.infants > 0 ? `, ${booking.infants} infant${booking.infants === 1 ? "" : "s"}` : ""}`;
  lines.push(`Travellers: ${party}.`);
  return lines;
}

export async function submitMarketplaceBooking(actor: Actor | null, input: unknown, now: Date = new Date()) {
  const raw = submissionInput.parse(input);

  let tourId = raw.tourId;
  let tourTitle: string | null = null;
  if (!tourId && raw.tourSlug) {
    const tour = await prisma.tourProduct.findUnique({
      where: { slug: raw.tourSlug },
      select: { id: true, title: true, published: true },
    });
    if (!tour || !tour.published) throw new NotFoundError("Tour");
    tourId = tour.id;
    tourTitle = tour.title;
  }

  const booking = await createBooking(actor, { ...raw, tourId }, now);
  if (!tourTitle && booking.tourId) {
    const tour = await prisma.tourProduct.findUnique({
      where: { id: booking.tourId },
      select: { title: true },
    });
    tourTitle = tour?.title ?? null;
  }
  const what =
    booking.source === "CUSTOM" ? "a custom-designed safari" : tourTitle ? `“${tourTitle}”` : "a safari";

  // Client confirmation, always with the reference.
  await notify({
    event: "submission.received",
    channels: ["EMAIL", "IN_APP"],
    to: { email: booking.customerEmail, userId: booking.userId ?? undefined },
    bookingId: booking.id,
    template: {
      name: "submissionReceived",
      input: {
        name: booking.customerName,
        reference: booking.reference,
        details: [...travelSummary(booking), `You asked for ${what}.`],
        ctaUrl: booking.userId
          ? `${SITE_URL}/safari/${booking.reference}`
          : `${SITE_URL}/register`,
        ctaLabel: booking.userId ? "View my safari" : "Create an account to track your safari",
      },
    },
    dedupeKey: `submission:${booking.id}:client`,
  });

  // Staff alert: in-app record plus email/WhatsApp where configured.
  const staff = await businessContact();
  const staffDetails = [
    `${booking.customerName} (${booking.customerEmail}${booking.customerPhone ? `, ${booking.customerPhone}` : ""}) requested ${what}.`,
    ...travelSummary(booking),
    ...(booking.budgetRange ? [`Budget: ${booking.budgetRange}.`] : []),
    ...(booking.pickupLocation ? [`Pickup: ${booking.pickupLocation}.`] : []),
  ];
  await notify({
    event: "submission.staff-alert",
    channels: ["IN_APP"],
    bookingId: booking.id,
    subject: `New safari request ${booking.reference}`,
    body: staffDetails.join(" "),
    dedupeKey: `submission:${booking.id}:staff-inapp`,
  });
  if (staff.email) {
    await notify({
      event: "submission.staff-alert",
      channels: ["EMAIL"],
      to: { email: staff.email },
      bookingId: booking.id,
      template: {
        name: "newSubmission",
        input: { reference: booking.reference, details: staffDetails },
      },
      dedupeKey: `submission:${booking.id}:staff-email`,
    });
  }
  if (staff.phone && process.env.WHATSAPP_HOOK_URL) {
    await notify({
      event: "submission.staff-alert",
      channels: ["WHATSAPP"],
      to: { phone: staff.phone },
      bookingId: booking.id,
      subject: `New safari request ${booking.reference}`,
      body: `New request ${booking.reference}: ${booking.customerName}, ${what}. Open the booking to review.`,
      dedupeKey: `submission:${booking.id}:staff-whatsapp`,
    });
  }

  return booking;
}
