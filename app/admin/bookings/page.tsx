import Link from "next/link";
import { FilterBar, SearchInput, StatusTabs } from "@/components/admin/filter-bar";
import { MoneyDual } from "@/components/finance/money-dual";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatMoney } from "@/lib/money";
import { getDisplayCurrency } from "@/lib/display-currency";
import { prisma } from "@/lib/prisma";
import { listBookings } from "@/server/bookings";
import { requestActor } from "@/server/http";
import type { BookingStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const PIPELINE: BookingStatus[] = [
  "NEW",
  "IN_REVIEW",
  "SUPPLIERS_PENDING",
  "QUOTE_DRAFT",
  "QUOTE_APPROVED",
  "QUOTE_SENT",
  "CLIENT_REVISION",
  "AWAITING_PAYMENT",
  "PARTIALLY_PAID",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status, search } = await searchParams;
  const actor = await requestActor();
  const [bookings, displayCurrency] = await Promise.all([
    listBookings(actor, (status as BookingStatus) || undefined, search),
    getDisplayCurrency(),
  ]);
  const kesRate = await prisma.currencyRate
    .findUnique({ where: { currency: "KES" } })
    .catch(() => null);
  const rate = kesRate
    ? { rateToBase: Number(kesRate.rateToBase), asOf: kesRate.asOf.toISOString() }
    : null;
  const grouped = new Map<string, typeof bookings>();
  for (const booking of bookings) {
    const list = grouped.get(booking.status) ?? [];
    list.push(booking);
    grouped.set(booking.status, list);
  }

  return (
    <div className="grid gap-4">
      <FilterBar title="Booking pipeline" count={bookings.length}>
        <StatusTabs
          options={[
            { value: null, label: "All" },
            ...PIPELINE.map((stage) => ({
              value: stage as string,
              label: stage.replaceAll("_", " "),
            })),
          ]}
        />
        <SearchInput
          defaultValue={search ?? ""}
          placeholder="Search reference, name, email…"
          label="Search by reference, name or email"
        />
      </FilterBar>
      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings"
          description={status ? "Nothing with this status. Clear the filter to see everything." : "New enquiries and reservations will land here."}
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {PIPELINE.map((stage) => {
            const cards = grouped.get(stage) ?? [];
            if (status && stage !== status) return null;
            if (cards.length === 0 && status !== stage) return null;
            return (
              <section key={stage} aria-label={`${stage} bookings`}>
                <h3 className="type-label text-ink/60">
                  {stage.replaceAll("_", " ")} · {cards.length}
                </h3>
                <div className="mt-2 grid gap-2">
                  {cards.map((booking) => (
                    <Card key={booking.id}>
                      <CardBody className="p-4">
                        <div className="flex items-baseline justify-between gap-2">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="type-small font-semibold hover:text-clay-deep"
                          >
                            {booking.reference}
                          </Link>
                          <span className="type-caption type-numeric text-ink/70">
                            <MoneyDual
                              amountCents={Math.max(0, booking.totalCents - booking.paidCents)}
                              currency={booking.currency}
                              displayCurrency={displayCurrency}
                              rate={rate}
                            />
                          </span>
                        </div>
                        <p className="type-caption mt-0.5 text-ink/65">
                          {booking.customerName} · {booking.adults + booking.children + booking.infants} pax
                          {booking.assignedAdmin ? ` · ${booking.assignedAdmin.name}` : " · unassigned"}
                          {booking.priority !== "NORMAL" ? ` · ${booking.priority}` : ""}
                        </p>
                        <p className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone="neutral">{booking.tour?.title ?? "Custom"}</Badge>
                          <Badge tone="sand">{formatMoney(booking.totalCents, booking.currency)}</Badge>
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
