import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { dashboardStats } from "@/server/operations";
import { inboxCounts } from "@/server/workspace";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const actor = await requestActor();
  const [stats, inbox] = await Promise.all([dashboardStats(actor), inboxCounts(actor)]);

  const tiles = [
    { label: "Active bookings", value: String(stats.activeBookings) },
    { label: "Arrivals today", value: String(stats.arrivalsToday) },
    { label: "Departures today", value: String(stats.departuresToday) },
    { label: "Transfers today", value: String(stats.transfersToday) },
    { label: "Vehicles in use", value: String(stats.vehiclesInUse) },
    { label: "Guides on duty", value: String(stats.guidesOnDuty) },
    { label: "Holds expiring <48h", value: String(stats.holdsExpiring) },
    { label: "Revenue 30d ≈", value: formatMoney(stats.revenue30d, "USD") },
  ];

  return (
    <div className="grid gap-6">
      <section aria-label="Today">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardBody>
                <p className="type-label text-ink/60">{tile.label}</p>
                <p className="type-h2 type-numeric mt-1">{tile.value}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        <p className="type-small mt-3 text-ink/70">
          Outstanding across open bookings:{" "}
          <strong className="type-numeric">{formatMoney(stats.outstandingCents, "USD")}</strong>{" "}
          (mixed currencies shown in USD cents — per-booking pages show true currency).
        </p>
      </section>

      <section aria-label="Needs action">
        <h2 className="type-h3">Needs action</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/admin/bookings?status=NEW">
            <Badge tone={inbox.newRequests > 0 ? "clay" : "neutral"}>New requests · {inbox.newRequests}</Badge>
          </Link>
          <Link href="/admin/bookings?status=QUOTE_SENT">
            <Badge tone={inbox.quotesAwaiting > 0 ? "sand" : "neutral"}>Quotes awaiting answer · {inbox.quotesAwaiting}</Badge>
          </Link>
          <Badge tone={inbox.supplierReplies > 0 ? "sand" : "neutral"}>Supplier replies pending · {inbox.supplierReplies}</Badge>
          <Link href="/admin/bookings?status=AWAITING_DEPOSIT">
            <Badge tone={inbox.paymentsOverdue > 0 ? "clay" : "neutral"}>Deposits overdue · {inbox.paymentsOverdue}</Badge>
          </Link>
        </div>
        {inbox.tripsSoon.length > 0 ? (
          <ul className="type-small mt-3 grid gap-1 text-ink/80">
            {inbox.tripsSoon.map((trip) => (
              <li key={trip.id}>
                <Link href={`/admin/bookings/${trip.id}`} className="underline underline-offset-4">
                  {trip.reference}
                </Link>{" "}
                · {trip.detail}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-label="Booking pipeline">
        <h2 className="type-h3">Booking pipeline</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {stats.pipeline.map((stage) => (
            <Link key={stage.status} href={`/admin/bookings?status=${stage.status}`}>
              <Badge tone={stage.count > 0 ? "sand" : "neutral"}>
                {stage.status.replaceAll("_", " ")} · {stage.count}
              </Badge>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
