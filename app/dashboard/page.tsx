import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationFeed } from "@/components/portal/notifications";
import { PortalShell } from "@/components/portal/portal-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { currentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { bookingChecklist } from "@/lib/portal-view";
import { listMyBookings } from "@/server/portal";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "CUSTOMER") redirect("/admin/tours");

  const bookings = await listMyBookings(user);
  const upcoming =
    bookings.find((b) =>
      ["HOLD", "AWAITING_DEPOSIT", "CONFIRMED", "PRE_TRIP", "ON_SAFARI"].includes(b.status),
    ) ?? bookings[0];

  return (
    <PortalShell>
      <p className="type-label text-clay-deep">Your African journey</p>
      <h1 className="type-h1 mt-2 text-balance">
        {user.name.split(" ")[0]}’s safaris
      </h1>

      {upcoming ? (
        <Card className="mt-6">
          <CardBody>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="type-h3">{upcoming.tour?.title ?? "Custom journey"}</h2>
              <Badge tone="sand">{upcoming.status.replaceAll("_", " ")}</Badge>
            </div>
            <p className="type-small mt-1 text-ink/70">
              {upcoming.reference} · {upcoming.adults + upcoming.children + upcoming.infants} traveller
              {upcoming.adults + upcoming.children + upcoming.infants === 1 ? "" : "s"}
              {upcoming.totalCents > 0 ? (
                <> · balance {formatMoney(Math.max(0, upcoming.totalCents - upcoming.paidCents), upcoming.currency)}</>
              ) : null}
            </p>
            <div className="mt-3">
              <ButtonLink href={`/safari/${upcoming.reference}`} size="sm">
                Open my safari
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardBody>
            <h2 className="type-h3">No upcoming safaris</h2>
            <p className="type-small mt-1 text-ink/70">
              Design one and send it to a planner, or browse ready itineraries.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink href="/builder" size="sm">
                Design your safari
              </ButtonLink>
              <ButtonLink href="/tours" variant="secondary" size="sm">
                Explore safaris
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      )}

      <NotificationFeed />

      {bookings.length > 0 ? (
        <div className="mt-6">
          <h2 className="type-h3">My journeys</h2>
          <ul className="mt-2 divide-y divide-ink/10">
            {bookings.map((booking) => (
              <li key={booking.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <Link
                  href={`/safari/${booking.reference}`}
                  className="type-small font-medium hover:text-clay-deep"
                >
                  {booking.tour?.title ?? "Custom journey"}
                </Link>
                <span className="type-caption text-ink/60">
                  {booking.reference} · {booking.status.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <h2 className="type-h3 mt-8">Before you travel</h2>
      <p className="type-small mt-1 text-ink/70">
        {(() => {
          const pending = bookings.flatMap((b) =>
            bookingChecklist({
              depositCents: b.depositCents,
              paidCents: b.paidCents,
              totalCents: b.totalCents,
              adults: b.adults,
              children: b.children,
              travelStart: b.travelStart,
              travellers: ("travellers" in b && Array.isArray(b.travellers) ? b.travellers : []).map((t) => ({
                passportNumber: t.passportNumber ?? null,
                nationality: t.nationality ?? null,
              })),
            }).filter((item) => item.status === "pending"),
          );
          return pending.length === 0
            ? "Everything is complete across your journeys."
            : `${pending.length} checklist item${pending.length === 1 ? "" : "s"} open across your journeys.`;
        })()}
      </p>
    </PortalShell>
  );
}
