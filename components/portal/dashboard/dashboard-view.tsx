"use client";

import { useState } from "react";
import { BookingHistory } from "@/components/portal/dashboard/booking-history";
import { GreetingHeader } from "@/components/portal/dashboard/greeting-header";
import { InspirationRow } from "@/components/portal/dashboard/inspiration-row";
import { OpsGrid } from "@/components/portal/dashboard/ops-cards";
import { EmptyHero, UpcomingHero } from "@/components/portal/dashboard/upcoming-hero";
import { pickUpcoming } from "@/lib/dashboard";
import type { DashboardBookingCard, InspirationCard } from "@/lib/dashboard";

export function DashboardView({
  firstName,
  bookings,
  inspiration,
}: {
  firstName: string;
  bookings: DashboardBookingCard[];
  inspiration: InspirationCard[];
}) {
  const [query, setQuery] = useState("");
  const upcoming = pickUpcoming(bookings);

  return (
    <div className="grid gap-5">
      <GreetingHeader
        firstName={firstName}
        journeyCount={bookings.length}
        query={query}
        onQueryChange={setQuery}
      />
      {upcoming ? (
        <>
          <UpcomingHero booking={upcoming} />
          <OpsGrid booking={upcoming} />
        </>
      ) : (
        <EmptyHero />
      )}
      {bookings.length > 0 ? <BookingHistory bookings={bookings} query={query} /> : null}
      <InspirationRow tours={inspiration} query={query} />
    </div>
  );
}
