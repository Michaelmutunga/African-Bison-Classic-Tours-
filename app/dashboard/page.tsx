import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/portal/dashboard/dashboard-view";
import { JourneyCalendar } from "@/components/portal/dashboard/journey-calendar";
import { PortalAppShell } from "@/components/portal/dashboard/portal-app-shell";
import {
  ConciergeRailCard,
  PaymentsRailCard,
  UpdatesRailCard,
} from "@/components/portal/dashboard/rail-cards";
import { currentUser } from "@/lib/auth";
import {
  countdownLabel,
  pickUpcoming,
  type DashboardBookingCard,
  type InspirationCard,
} from "@/lib/dashboard";
import { imageForTour, imageForTourUnique } from "@/lib/imagery";
import { bookingChecklist, journeyProgress } from "@/lib/portal-view";
import { listTours } from "@/server/catalogue";
import { listMyBookings } from "@/server/portal";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "CUSTOMER") redirect("/admin/tours");

  const bookings = await listMyBookings(user);

  const cards: DashboardBookingCard[] = bookings.map((booking) => {
    const party = booking.adults + booking.children + booking.infants;
    const checklist = bookingChecklist({
      depositCents: booking.depositCents,
      paidCents: booking.paidCents,
      totalCents: booking.totalCents,
      adults: booking.adults,
      children: booking.children,
      travelStart: booking.travelStart,
      travellers: booking.travellers,
    });
    const progress = journeyProgress(booking.status);
    const travelStart = toIso(booking.travelStart);
    const image =
      booking.tour && booking.tour.category
        ? imageForTour(booking.tour.slug, booking.tour.category.slug)
        : null;
    return {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      currency: booking.currency,
      totalCents: booking.totalCents,
      paidCents: booking.paidCents,
      depositCents: booking.depositCents,
      party,
      travelStart,
      travelEnd: toIso(booking.travelEnd),
      tourTitle: booking.tour?.title ?? "Custom journey",
      tourSlug: booking.tour?.slug ?? null,
      tourCategory: booking.tour?.category?.slug ?? null,
      travellerCount: booking.travellers.length,
      checklist,
      progressLabel: progress.label,
      progressStage: progress.stage,
      progressOf: progress.of,
      countdown: countdownLabel(travelStart, booking.status),
      heroImage: image
        ? { src: image.src, alt: image.alt, width: image.width, height: image.height }
        : null,
    };
  });

  const upcoming = pickUpcoming(cards);

  let inspiration: InspirationCard[] = [];
  try {
    const tours = await listTours({ publishedOnly: true });
    const used = new Set<string>();
    inspiration = tours.slice(0, 3).map((tour) => {
      const image = imageForTourUnique(tour.slug, tour.category.slug, used);
      return {
        slug: tour.slug,
        title: tour.title,
        durationDays: tour.durationDays,
        destinations:
          tour.destinations.map((destination) => destination.name).slice(0, 3).join(" · ") ||
          "East Africa",
        image: image
          ? { src: image.src, alt: image.alt, width: image.width, height: image.height }
          : null,
      };
    });
  } catch {
    inspiration = [];
  }

  const firstName = user.name.split(" ")[0] || "Traveller";

  return (
    <PortalAppShell
      rail={
        <>
          <JourneyCalendar
            journeys={cards
              .filter((card) => card.travelStart)
              .map((card) => ({
                startIso: card.travelStart as string,
                endIso: card.travelEnd,
                reference: card.reference,
                title: card.tourTitle,
              }))}
          />
          {upcoming ? <PaymentsRailCard booking={upcoming} /> : null}
          <ConciergeRailCard />
          <UpdatesRailCard />
        </>
      }
    >
      <DashboardView firstName={firstName} bookings={cards} inspiration={inspiration} />
    </PortalAppShell>
  );
}
