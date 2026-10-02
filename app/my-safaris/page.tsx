import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PortalAppShell } from "@/components/portal/dashboard/portal-app-shell";
import { ConciergeRailCard, UpdatesRailCard } from "@/components/portal/dashboard/rail-cards";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { currentUser } from "@/lib/auth";
import { formatDay } from "@/lib/dashboard";
import { imageForTour } from "@/lib/imagery";
import { journeyProgress } from "@/lib/portal-view";
import { listMyBookings } from "@/server/portal";

export const metadata: Metadata = {
  title: "My safaris",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export default async function MySafarisPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/my-safaris");
  if (user.role !== "CUSTOMER") redirect("/admin/tours");

  const bookings = await listMyBookings(user);

  return (
    <PortalAppShell
      rail={
        <>
          <ConciergeRailCard />
          <UpdatesRailCard />
        </>
      }
    >
      <p className="type-label text-clay-deep">Journey history</p>
      <h1 className="type-h1 mt-2">My safaris</h1>
      <p className="type-small mt-1 text-ink/65">
        {bookings.length === 0
          ? "Every safari you take with us will live here."
          : `${bookings.length} ${bookings.length === 1 ? "journey" : "journeys"} so far.`}
      </p>
      {bookings.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No safaris yet"
            description="Your confirmed and past journeys will live here."
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {bookings.map((booking) => {
            const image =
              booking.tour && booking.tour.category
                ? imageForTour(booking.tour.slug, booking.tour.category.slug)
                : null;
            const progress = journeyProgress(booking.status);
            const party = booking.adults + booking.children + booking.infants;
            return (
              <li key={booking.id}>
                <Link
                  href={`/safari/${booking.reference}`}
                  className="portal-card group block overflow-hidden"
                >
                  {image ? (
                    <Image
                      src={image.src}
                      alt={image.alt}
                      width={image.width}
                      height={image.height}
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div aria-hidden="true" className="aspect-[16/9] w-full bg-sand" />
                  )}
                  <span className="block p-5">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="type-h3 group-hover:text-clay-deep">
                        {booking.tour?.title ?? "Custom journey"}
                      </span>
                      <Badge tone={booking.status === "COMPLETED" ? "earth" : "sand"}>
                        {progress.label}
                      </Badge>
                    </span>
                    <span className="type-small mt-1.5 block text-ink/65">
                      <span className="type-numeric">{booking.reference}</span>
                      {" · "}
                      {formatDay(toIso(booking.travelStart))}
                      {booking.travelEnd ? ` to ${formatDay(toIso(booking.travelEnd))}` : ""}
                      {" · "}
                      {party} {party === 1 ? "traveller" : "travellers"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PortalAppShell>
  );
}
