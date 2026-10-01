import { notFound } from "next/navigation";
import { Container } from "@/components/ui/layout";
import { Timeline } from "@/components/ui/timeline";
import { currentUser } from "@/lib/auth";
import { requireBookingAccess } from "@/server/portal";
import { NotFoundError } from "@/server/catalogue";
import { imageForActivity } from "@/lib/imagery";

export const dynamic = "force-dynamic";

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  let booking;
  try {
    booking = await requireBookingAccess(await currentUser(), reference);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <Container className="max-w-3xl py-12">
      <p className="type-label text-clay-deep">{booking.reference} · Trip itinerary</p>
      <h1 className="type-h1 mt-2 text-balance">{booking.tour?.title ?? "Custom journey"}</h1>
      {booking.tour && booking.tour.days.length > 0 ? (
        <div className="mt-8">
          <Timeline
            entries={booking.tour.days.map((day) => ({
              id: `day-${day.dayNumber}`,
              marker: `Day ${day.dayNumber}`,
              title: day.title,
              image: imageForActivity(`${day.title} ${day.body}`),
              detail: <p className="mt-1">{day.body}</p>,
            }))}
          />
        </div>
      ) : (
        <p className="type-body mt-6 text-ink/75">
          A custom route planned with your consultant — the day-by-day plan
          lands here once confirmed.
        </p>
      )}
      <p className="type-small mt-8 text-ink/70">
        Accommodation named here may be substituted with a property of similar
        standard when fully booked; your confirmation always states exactly
        where you stay. Wildlife sightings are never guaranteed.
      </p>
    </Container>
  );
}
