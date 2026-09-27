import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AssignForm,
  DocumentAttach,
  InvoiceActions,
  MessageReply,
  NoteForm,
  RefundButton,
  StatusButtons,
  TransferForm,
  TransferStatus,
  UnassignButton,
} from "@/components/admin/booking-workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { getBooking } from "@/server/bookings";
import { TRANSITIONS } from "@/server/bookings";
import { listGuides, listInternalNotes, listVehicles } from "@/server/operations";
import { prisma } from "@/lib/prisma";
import { requestActor } from "@/server/http";
import { NotFoundError } from "@/server/catalogue";

export const dynamic = "force-dynamic";

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requestActor();
  let booking;
  try {
    booking = await getBooking(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const [vehicles, guides, notes, transfers, payments, invoices, documents, messages] = await Promise.all([
    listVehicles("active"),
    listGuides("active"),
    listInternalNotes(actor, id),
    prisma.transfer.findMany({ where: { bookingId: id }, orderBy: { scheduledAt: "asc" } }),
    prisma.payment.findMany({ where: { bookingId: id }, orderBy: { createdAt: "asc" } }),
    prisma.invoice.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    prisma.document.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" } }),
    prisma.customerMessage.findMany({ where: { bookingId: id }, orderBy: { createdAt: "asc" } }),
  ]);
  const vehicleAssignments = await prisma.vehicleAssignment.findMany({
    where: { bookingId: id },
    include: { vehicle: true },
  });
  const guideAssignments = await prisma.guideAssignment.findMany({
    where: { bookingId: id },
    include: { guide: true },
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="type-label text-clay-deep">{booking.reference}</p>
          <h2 className="type-h2 mt-1">
            {booking.customerName} · {booking.tour?.title ?? "Custom journey"}
          </h2>
        </div>
        <Badge tone="sand">{booking.status.replaceAll("_", " ")}</Badge>
      </div>

      <Card>
        <CardBody>
          <h3 className="type-h3">Status</h3>
          <div className="mt-2">
            <StatusButtons bookingId={booking.id} next={TRANSITIONS[booking.status]} />
          </div>
          <dl className="type-small mt-3 grid gap-1 text-ink/75 sm:grid-cols-2">
            <div className="flex justify-between gap-2"><dt>Total</dt><dd className="type-numeric">{formatMoney(booking.totalCents, booking.currency)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Paid</dt><dd className="type-numeric">{formatMoney(booking.paidCents, booking.currency)}</dd></div>
            <div className="flex justify-between gap-2"><dt>Party</dt><dd>{booking.adults + booking.children + booking.infants}</dd></div>
            <div className="flex justify-between gap-2"><dt>Contact</dt><dd>{booking.customerEmail}</dd></div>
          </dl>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="type-h3">Crew & fleet</h3>
            <ul className="type-small mt-2 grid gap-1.5">
              {vehicleAssignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span>{a.vehicle.registration} ({a.vehicle.type})</span>
                  <UnassignButton assignmentId={a.id} kind="vehicle" />
                </li>
              ))}
              {guideAssignments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span>{a.guide.name}</span>
                  <UnassignButton assignmentId={a.id} kind="guide" />
                </li>
              ))}
              {vehicleAssignments.length === 0 && guideAssignments.length === 0 ? (
                <li className="text-ink/60">Nothing assigned yet.</li>
              ) : null}
            </ul>
            <div className="mt-4 grid gap-4">
              <AssignForm
                bookingId={booking.id}
                kind="vehicle"
                options={vehicles.map((v) => ({ id: v.id, label: `${v.registration} (${v.type}, ${v.capacity}pax)` }))}
              />
              <AssignForm
                bookingId={booking.id}
                kind="guide"
                options={guides.map((g) => ({ id: g.id, label: `${g.name}${g.languages.length > 0 ? ` — ${g.languages.join(", ")}` : ""}` }))}
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Transfers</h3>
            <ul className="type-small mt-2 grid gap-1.5">
              {transfers.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span>
                    {t.pickup} → {t.dropoff} · {t.passengers}pax ·{" "}
                    {new Date(t.scheduledAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <TransferStatus id={t.id} status={t.status} />
                </li>
              ))}
              {transfers.length === 0 ? <li className="text-ink/60">No transfers yet.</li> : null}
            </ul>
            <div className="mt-4">
              <TransferForm bookingId={booking.id} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Travellers ({booking.travellers.length})</h3>
            <ul className="type-small mt-2 grid gap-1">
              {booking.travellers.map((t) => (
                <li key={t.id}>
                  {t.fullName} · {t.kind}
                  {t.nationality ? ` · ${t.nationality}` : " · passport pending"}
                </li>
              ))}
              {booking.travellers.length === 0 ? <li className="text-ink/60">None listed.</li> : null}
            </ul>
            <h3 className="type-h3 mt-5">Payments</h3>
            <ul className="type-small mt-2 grid gap-1">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {p.kind.toLowerCase()} · {formatMoney(p.amountCents, p.currency)} · {p.status.toLowerCase()}
                  </span>
                  {p.status === "SUCCEEDED" ? (
                    <RefundButton paymentId={p.id} maxCents={p.amountCents} currency={p.currency} />
                  ) : null}
                </li>
              ))}
              {payments.length === 0 ? <li className="text-ink/60">No payments yet.</li> : null}
            </ul>
            <h3 className="type-h3 mt-5">Invoices</h3>
            <ul className="type-small mt-2 grid gap-1">
              {invoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link href="/admin/invoices" className="underline underline-offset-4">
                    {invoice.number}
                  </Link>{" "}
                  · {formatMoney(invoice.totalCents, invoice.currency)} · {invoice.status.toLowerCase()}
                </li>
              ))}
            </ul>
            <div className="mt-2">
              <InvoiceActions bookingId={booking.id} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Customer messages</h3>
            <ul className="type-small mt-2 grid max-h-64 gap-2 overflow-y-auto">
              {messages.map((m) => (
                <li key={m.id} className="rounded-[2px] border border-ink/10 px-3 py-2">
                  <span className="type-caption text-ink/60">{m.authorRole === "staff" ? "Team" : "Customer"}</span>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              ))}
              {messages.length === 0 ? <li className="text-ink/60">No messages yet.</li> : null}
            </ul>
            <div className="mt-3">
              <MessageReply bookingId={booking.id} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Internal notes</h3>
            <ul className="type-small mt-2 grid gap-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-[2px] bg-parchment px-3 py-2">
                  <p className="whitespace-pre-wrap">{note.body}</p>
                </li>
              ))}
              {notes.length === 0 ? <li className="text-ink/60">No notes yet.</li> : null}
            </ul>
            <div className="mt-3">
              <NoteForm bookingId={booking.id} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Documents</h3>
            <ul className="type-small mt-2 grid gap-1">
              {documents.map((doc) => (
                <li key={doc.id}>
                  {doc.title} <span className="text-ink/55">({doc.kind})</span>
                </li>
              ))}
              {documents.length === 0 ? <li className="text-ink/60">None attached.</li> : null}
            </ul>
            <div className="mt-3">
              <DocumentAttach bookingId={booking.id} />
            </div>
            <h3 className="type-h3 mt-5">Status history</h3>
            <ol className="type-small mt-2 grid gap-1">
              {booking.history.map((h) => (
                <li key={h.id} className="text-ink/70">
                  {h.from ? `${h.from.replaceAll("_", " ")} → ` : ""}
                  <strong>{h.to.replaceAll("_", " ")}</strong>
                  {h.reason ? ` — ${h.reason}` : ""}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
