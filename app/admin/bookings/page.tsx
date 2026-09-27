import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { listBookings } from "@/server/bookings";
import { requestActor } from "@/server/http";
import type { BookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PIPELINE: BookingStatus[] = [
  "INQUIRY",
  "HOLD",
  "AWAITING_DEPOSIT",
  "CONFIRMED",
  "PRE_TRIP",
  "ON_SAFARI",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const actor = await requestActor();
  const bookings = await listBookings(actor, (status as BookingStatus) || undefined);
  const grouped = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const list = grouped.get(booking.status) ?? [];
    list.push(booking);
    grouped.set(booking.status, list);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-h3">Booking pipeline</h2>
        <Link href="/admin/bookings" className="type-small underline underline-offset-4">
          Clear filter
        </Link>
      </div>
      {bookings.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No bookings" description="Nothing in this view yet." />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {PIPELINE.map((stage) => {
            const cards = grouped.get(stage) ?? [];
            if (status && stage !== status) return null;
            return (
              <section key={stage} aria-label={`${stage} bookings`}>
                <h3 className="type-label text-ink/60">
                  {stage.replaceAll("_", " ")} · {cards.length}
                </h3>
                <div className="mt-2 grid gap-2">
                  {cards.map((booking) => (
                    <Card key={booking.id}>
                      <CardBody className="p-4">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="type-small font-semibold hover:text-clay-deep"
                        >
                          {booking.reference}
                        </Link>
                        <p className="type-caption mt-0.5 text-ink/65">
                          {booking.customerName} · {booking.adults + booking.children + booking.infants} pax
                        </p>
                        <p className="mt-1">
                          <Badge tone="neutral">{booking.tour?.title ?? "Custom"}</Badge>
                        </p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
