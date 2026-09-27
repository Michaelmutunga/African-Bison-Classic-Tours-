"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageThread } from "@/components/portal/message-thread";
import { PayPanel } from "@/components/portal/pay-panel";
import { TravellerManager } from "@/components/portal/traveller-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Timeline } from "@/components/ui/timeline";
import { formatMoney } from "@/lib/money";
import { bookingChecklist, journeyProgress, tripDayNumber } from "@/lib/portal-view";
import type { PortalBooking } from "@/server/portal";

function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function SafariWorkspace({ booking }: { booking: PortalBooking }) {
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
  const inTrip = booking.status === "ON_SAFARI";
  const dayNumber = inTrip ? tripDayNumber(booking.travelStart) : null;
  const todayEntry =
    dayNumber !== null ? booking.tour?.days.find((d) => d.dayNumber === dayNumber) : undefined;
  const countries = [...new Set((booking.tour?.destinations ?? []).map((d) => d.country))];
  const balance = Math.max(0, booking.totalCents - booking.paidCents);
  const travellersEditable = ["INQUIRY", "HOLD", "AWAITING_DEPOSIT", "CONFIRMED", "PRE_TRIP"].includes(
    booking.status,
  );
  const payable = ["HOLD", "AWAITING_DEPOSIT", "CONFIRMED", "PRE_TRIP"].includes(booking.status);

  return (
    <div>
      {inTrip && dayNumber !== null ? (
        <section aria-label="Today on safari" className="rounded-[2px] bg-ink px-5 py-6 text-ivory sm:px-8">
          <p className="type-label text-sand">Today · Day {dayNumber}</p>
          <h2 className="type-h2 mt-1">
            {todayEntry ? todayEntry.title : (booking.tour?.title ?? "On safari")}
          </h2>
          {todayEntry ? <p className="type-body mt-2 text-ivory/80">{todayEntry.body}</p> : null}
          <p className="type-small mt-3 text-ivory/70">
            Your guide details appear here once operations assigns your crew — contact the team
            anytime via Messages.
          </p>
        </section>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div>
          <Tabs
            items={[
              {
                id: "journey",
                label: "Journey",
                content: (
                  <div className="grid gap-6">
                    <div>
                      <h3 className="type-h3">Route</h3>
                      {(booking.tour?.destinations ?? []).length > 0 ? (
                        <ol className="mt-2 grid gap-1.5">
                          {(booking.tour?.destinations ?? []).map((destination, index) => (
                            <li key={destination.slug} className="type-small">
                              <span className="type-label text-clay-deep">{String(index + 1).padStart(2, "0")} · </span>
                              {destination.name} ({destination.country})
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="type-small mt-2 text-ink/70">
                          A custom route — your planner confirms each stop.
                        </p>
                      )}
                    </div>
                    {booking.tour && booking.tour.days.length > 0 ? (
                      <div>
                        <h3 className="type-h3">Day by day</h3>
                        <div className="mt-3">
                          <Timeline
                            entries={booking.tour.days.map((day) => ({
                              id: `day-${day.dayNumber}`,
                              marker: `Day ${day.dayNumber}`,
                              title: day.title,
                              detail: <p className="mt-1">{day.body}</p>,
                            }))}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                ),
              },
              {
                id: "travellers",
                label: `Travellers (${booking.travellers.length})`,
                content: (
                  <TravellerManager
                    reference={booking.reference}
                    travellers={booking.travellers}
                    editable={travellersEditable}
                  />
                ),
              },
              {
                id: "payments",
                label: "Payments",
                content: (
                  <PayPanel
                    bookingId={booking.id}
                    reference={booking.reference}
                    currency={booking.currency}
                    totalCents={booking.totalCents}
                    paidCents={booking.paidCents}
                    depositCents={booking.depositCents}
                    payments={booking.payments}
                    payable={payable && balance > 0}
                  />
                ),
              },
              {
                id: "documents",
                label: "Documents",
                content: <DocumentsSection reference={booking.reference} />,
              },
              {
                id: "messages",
                label: `Messages (${booking.messages.length})`,
                content: (
                  <MessageThread
                    reference={booking.reference}
                    initial={booking.messages}
                    closed={["CANCELLED", "EXPIRED", "REFUNDED"].includes(booking.status)}
                  />
                ),
              },
            ]}
          />
        </div>
        <aside className="grid content-start gap-4" aria-label="Journey status">
          <Card>
            <CardBody>
              <p className="type-label text-clay-deep">Status</p>
              <p className="mt-1">
                <Badge tone="sand">{progress.label}</Badge>
              </p>
              <div
                role="img"
                aria-label={`Journey stage ${progress.stage} of ${progress.of}`}
                className="mt-3 h-1.5 w-full rounded-full bg-sand"
              >
                <div
                  className="h-1.5 rounded-full bg-clay"
                  style={{ width: `${(progress.stage / progress.of) * 100}%` }}
                />
              </div>
              <dl className="type-small mt-3 grid gap-1 text-ink/75">
                <div className="flex justify-between gap-2">
                  <dt>Reference</dt>
                  <dd className="type-numeric font-semibold">{booking.reference}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Dates</dt>
                  <dd>
                    {formatDate(booking.travelStart) ?? "TBC"}
                    {booking.travelEnd ? ` → ${formatDate(booking.travelEnd)}` : ""}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Party</dt>
                  <dd>
                    {booking.adults + booking.children + booking.infants} traveller
                    {booking.adults + booking.children + booking.infants === 1 ? "" : "s"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Balance</dt>
                  <dd className="type-numeric">{formatMoney(balance, booking.currency)}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="type-label text-clay-deep">Safari passport</p>
              <p className="type-h3 mt-1">
                {countries.length > 0 ? countries.join(" + ") : "East Africa"}
              </p>
              <p className="type-small mt-1 text-ink/70">
                {(booking.tour?.destinations ?? []).length} stops
                {booking.travelStart && booking.travelEnd
                  ? ` · ${formatDate(booking.travelStart)} → ${formatDate(booking.travelEnd)}`
                  : ""}
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="type-label text-clay-deep">Pre-trip checklist</p>
              <ul className="mt-2 grid gap-2">
                {checklist.map((item) => (
                  <li key={item.key} className="flex items-start gap-2">
                    <span aria-hidden="true" className={item.status === "complete" ? "text-earth" : "text-ink/35"}>
                      {item.status === "complete" ? "✓" : "○"}
                    </span>
                    <span>
                      <span className="type-small font-semibold">{item.label}</span>
                      <span className="type-caption block text-ink/60">{item.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DocumentsSection({ reference }: { reference: string }) {
  const [docs, setDocs] = useState<{ id: string; kind: string; title: string; url: string | null }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/account/bookings/${reference}/documents`);
        const body = (await response.json()) as { ok?: boolean; documents?: { id: string; kind: string; title: string; url: string | null }[] };
        if (cancelled) return;
        if (!response.ok || !body.ok || !body.documents) {
          setError("Could not load documents.");
          return;
        }
        setDocs(body.documents);
      } catch {
        if (!cancelled) setError("Could not load documents.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (error) return <p role="alert" className="type-small text-clay-deep">{error}</p>;
  if (!docs) return <p className="type-small text-ink/70">Loading documents…</p>;
  return (
    <ul className="grid gap-2">
      {docs.map((doc) => (
        <li key={doc.id} className="flex items-center justify-between gap-3 rounded-[2px] border border-ink/15 px-4 py-3">
          <span>
            <span className="type-small font-semibold">{doc.title}</span>
            <span className="type-caption block text-ink/60">{doc.kind}</span>
          </span>
          {doc.url ? (
            <Link href={doc.url} className="type-small shrink-0 underline underline-offset-4">
              Open
            </Link>
          ) : (
            <span className="type-caption text-ink/50">On file</span>
          )}
        </li>
      ))}
    </ul>
  );
}
