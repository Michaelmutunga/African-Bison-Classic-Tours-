import Link from "next/link";
import { StatCard } from "@/components/admin/stat-card";
import { MoneyDual } from "@/components/finance/money-dual";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { getDisplayCurrency } from "@/lib/display-currency";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { dashboardStats } from "@/server/operations";
import { inboxCounts } from "@/server/workspace";
import { requestActor } from "@/server/http";

export const dynamic = "force-dynamic";

function breakdownLine(map: Record<string, number>): string {
  const entries = Object.entries(map);
  if (entries.length === 0) return "Nothing open";
  return entries.map(([currency, cents]) => formatMoney(cents, currency)).join(" · ");
}

export default async function AdminDashboardPage() {
  const actor = await requestActor();
  const [stats, inbox, displayCurrency] = await Promise.all([
    dashboardStats(actor),
    inboxCounts(actor),
    getDisplayCurrency(),
  ]);
  const kesRate = await prisma.currencyRate
    .findUnique({ where: { currency: "KES" } })
    .catch(() => null);
  const rate = kesRate
    ? { rateToBase: Number(kesRate.rateToBase), asOf: kesRate.asOf.toISOString() }
    : null;

  const revenueEntries = Object.entries(stats.revenueByCurrency);
  const outstandingEntries = Object.entries(stats.outstandingByCurrency);

  return (
    <div className="grid gap-6">
      <section aria-label="Today">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active bookings" value={String(stats.activeBookings)} href="/admin/bookings" />
          <StatCard label="Arrivals today" value={String(stats.arrivalsToday)} href="/admin/calendar" />
          <StatCard label="Departures today" value={String(stats.departuresToday)} href="/admin/calendar" />
          <StatCard label="Transfers today" value={String(stats.transfersToday)} href="/admin/transfers" />
          <StatCard label="Vehicles in use" value={String(stats.vehiclesInUse)} href="/admin/fleet" />
          <StatCard label="Guides on duty" value={String(stats.guidesOnDuty)} href="/admin/fleet" />
          <StatCard
            label="Holds expiring <48h"
            value={String(stats.holdsExpiring)}
            href="/admin/bookings?status=HOLD"
            hint="Convert or release before expiry"
          />
          <StatCard
            label="Open pipeline stages"
            value={String(stats.pipeline.reduce((sum, stage) => sum + stage.count, 0))}
            href="/admin/bookings"
          />
        </div>
      </section>

      <section aria-label="Money summary">
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardBody>
              <p className="type-label text-ink/60">Revenue, last 30 days (by currency)</p>
              {revenueEntries.length === 0 ? (
                <p className="type-h3 mt-1">No settled payments</p>
              ) : (
                <ul className="mt-2 grid gap-1">
                  {revenueEntries.map(([currency, cents]) => (
                    <li key={currency} className="type-h3">
                      <MoneyDual
                        amountCents={cents}
                        currency={currency}
                        displayCurrency={displayCurrency}
                        rate={displayCurrency === "KES" || currency === "KES" ? rate : rate}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <p className="type-caption mt-2 text-ink/60">
                Settled payments only. Conversions are indicative at today&apos;s internal rate.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="type-label text-ink/60">Outstanding across open bookings</p>
              <p className="type-h3 type-numeric mt-1">{breakdownLine(stats.outstandingByCurrency)}</p>
              {outstandingEntries.length > 0 && displayCurrency === "KES" && rate ? (
                <p className="type-caption mt-1 text-ink/60">
                  Displayed per booking currency. Per-booking pages show the billed total.
                </p>
              ) : null}
              <p className="type-caption mt-2 text-ink/60">
                Never summed across currencies. Per-booking pages show true billed currency.
              </p>
            </CardBody>
          </Card>
        </div>
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
          <Link href="/admin/bookings?status=AWAITING_PAYMENT">
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
