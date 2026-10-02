"use client";

import Link from "next/link";
import { useState } from "react";
import type { DashboardBookingCard, JourneyTab } from "@/lib/dashboard";
import { formatDay, searchFilteredBookings, tabFilteredBookings } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const TABS: { id: JourneyTab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "all", label: "All" },
];

export function BookingHistory({
  bookings,
  query,
}: {
  bookings: DashboardBookingCard[];
  query: string;
}) {
  const [tab, setTab] = useState<JourneyTab>("upcoming");
  const visible = searchFilteredBookings(tabFilteredBookings(bookings, tab), query);

  return (
    <section aria-label="Booking history" className="portal-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-h3">Booking history</h2>
        <span className="type-caption text-ink/60">
          {visible.length} of {bookings.length} {bookings.length === 1 ? "journey" : "journeys"}
        </span>
      </div>
      <div role="tablist" aria-label="Filter journeys" className="mt-3 flex gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "type-small cursor-pointer rounded-full px-4 py-1.5 font-medium",
              tab === item.id ? "bg-ink text-ivory" : "text-ink/65 hover:bg-sand/50 hover:text-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="type-small mt-4 text-ink/65" role="status">
          {query.trim()
            ? `Nothing matches "${query.trim()}".`
            : tab === "past"
              ? "No past journeys yet. Completed safaris will appear here."
              : "No journeys in this view yet."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {visible.map((booking) => (
            <li key={booking.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/safari/${booking.reference}`}
                  className="type-small block truncate font-semibold hover:text-clay-deep"
                >
                  {booking.tourTitle}
                </Link>
                <p className="type-caption mt-0.5 text-ink/60">
                  <span className="type-numeric">{booking.reference}</span>
                  {" · "}
                  {booking.travelStart ? formatDay(booking.travelStart) : "Dates TBC"}
                  {booking.travelEnd ? ` to ${formatDay(booking.travelEnd)}` : ""}
                  {" · "}
                  {booking.party} {booking.party === 1 ? "traveller" : "travellers"}
                </p>
              </div>
              <Badge tone={booking.status === "COMPLETED" ? "earth" : "sand"}>
                {booking.status.replaceAll("_", " ")}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
