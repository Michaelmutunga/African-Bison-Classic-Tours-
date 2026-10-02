import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AssignAdminForm,
  AssignSupplierButton,
  DocumentAttach,
  DraftQuoteButton,
  InvoiceActions,
  MessageReply,
  NoteForm,
  ProposeLinesButton,
  QuoteActionButton,
  QuoteEditForm,
  RefundButton,
  RemoveLineButton,
  RequestSuppliersButton,
  ServiceLineForm,
  StatusButtons,
  TransferForm,
  TransferStatus,
  UnassignButton,
} from "@/components/admin/booking-workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody } from "@/components/ui/card";
import { DataTable, TableBody, TableCell, TableHead, TableHeaderCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { applyBps, DEPOSIT_BPS, formatMoney } from "@/lib/money";
import { formatPct } from "@/server/marketplace-pricing";
import { suggestSuppliers } from "@/server/suppliers";
import { bookingWorkspace, listStaff } from "@/server/workspace";
import { TRANSITIONS } from "@/server/bookings";
import { prisma } from "@/lib/prisma";
import { requestActor } from "@/server/http";
import { NotFoundError } from "@/server/catalogue";

export const dynamic = "force-dynamic";

function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}

function fmtDay(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const NEXT_ACTION: Record<string, string> = {
  NEW: "Review the request or auto-propose service lines",
  IN_REVIEW: "Request supplier availability, then draft the quote",
  SUPPLIERS_PENDING: "Chase replies, then generate the quote draft",
  QUOTE_DRAFT: "Review the draft, then approve it",
  QUOTE_APPROVED: "Send the quote to the client",
  QUOTE_SENT: "Chase the client or record their answer",
  CLIENT_REVISION: "Fold in the changes and save a new draft",
  AWAITING_PAYMENT: "Record the deposit",
  PARTIALLY_PAID: "Chase the balance, then confirm",
  CONFIRMED: "Prepare pre-trip checklist and documents",
  IN_PROGRESS: "Monitor the trip, then complete it",
  COMPLETED: "Closed — income realised",
  CANCELLED: "Closed — cancelled",
  EXPIRED: "Closed — expired",
  REFUND_PENDING: "Process the refund",
  REFUNDED: "Closed — refunded",
};

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requestActor();
  let workspace;
  try {
    workspace = await bookingWorkspace(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const { booking, pricing, payments, invoices, documents, messages, notes, locks, timeline, pastBookings, paidCents } = workspace;
  const [staff, transfers] = await Promise.all([
    listStaff(actor),
    prisma.transfer.findMany({ where: { bookingId: id }, orderBy: { scheduledAt: "asc" } }),
  ]);
  const vehicleAssignments = await prisma.vehicleAssignment.findMany({
    where: { bookingId: id },
    include: { vehicle: true },
  });
  const guideAssignments = await prisma.guideAssignment.findMany({
    where: { bookingId: id },
    include: { guide: true },
  });
  const now = new Date();
  const outstanding = Math.max(0, pricing.totalClientCents - paidCents);
  const depositDue = Math.max(0, applyBps(pricing.totalClientCents, DEPOSIT_BPS) - paidCents);

  // Supplier suggestions for unassigned lines that carry dates + location.
  // booking.serviceLines carries supplier/rate/lock relations; pricing
  // carries the money totals.
  const detailLines = booking.serviceLines;
  const suggestions = new Map<string, Awaited<ReturnType<typeof suggestSuppliers>>>();
  for (const line of detailLines) {
    if (line.supplierId || !line.startsAt || !line.endsAt || !line.location) continue;
    try {
      const matches = await suggestSuppliers(actor, {
        serviceType: line.serviceType,
        location: line.location,
        startsAt: line.startsAt.toISOString(),
        endsAt: line.endsAt.toISOString(),
        quantity: line.quantity,
      });
      suggestions.set(line.id, matches.slice(0, 3));
    } catch {
      suggestions.set(line.id, []);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/bookings" className="type-small underline underline-offset-4">
          ← All bookings
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <p className="type-label text-clay-deep">{booking.reference}</p>
          <Badge tone="sand">{booking.status.replaceAll("_", " ")}</Badge>
          {booking.priority !== "NORMAL" ? <Badge tone="clay">{booking.priority}</Badge> : null}
          <span className="type-small text-ink/65">
            opened {fmtDay(booking.createdAt)} · day {daysSince(booking.createdAt, now)} · owner:{" "}
            {booking.assignedAdmin ? booking.assignedAdmin.name : "unassigned"}
          </span>
        </div>
        <h2 className="type-h2 mt-1">
          {booking.customerName} · {booking.tour?.title ?? (booking.source === "CUSTOM" ? "Custom-designed safari" : "Custom journey")}
        </h2>
        <p className="type-small mt-1 text-ink/70">
          <strong>Next:</strong> {NEXT_ACTION[booking.status] ?? "Follow the pipeline"}
        </p>
        <div className="mt-3">
          <StatusButtons bookingId={booking.id} next={TRANSITIONS[booking.status]} />
        </div>
        <div className="mt-3 max-w-xl">
          <AssignAdminForm
            bookingId={booking.id}
            currentId={booking.assignedAdminId}
            staff={staff}
            priority={booking.priority}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="type-h3">Client</h3>
            <dl className="type-small mt-2 grid gap-1 text-ink/80">
              <div className="flex justify-between gap-2"><dt>Email</dt><dd>{booking.customerEmail}</dd></div>
              <div className="flex justify-between gap-2"><dt>Phone</dt><dd>{booking.customerPhone ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Nationality</dt><dd>{booking.nationality ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Contact via</dt><dd>{booking.contactChannel ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Occasion</dt><dd>{booking.occasion ?? "—"}</dd></div>
            </dl>
            <h4 className="type-label mt-4 text-ink/60">Past bookings ({pastBookings.length})</h4>
            {pastBookings.length === 0 ? (
              <p className="type-small mt-1 text-ink/60">First trip with us.</p>
            ) : (
              <ul className="type-small mt-1 grid gap-1">
                {pastBookings.map((past) => (
                  <li key={past.id}>
                    <Link href={`/admin/bookings/${past.id}`} className="underline underline-offset-4">
                      {past.reference}
                    </Link>{" "}
                    · {past.status.replaceAll("_", " ").toLowerCase()}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Trip request</h3>
            <dl className="type-small mt-2 grid gap-1 text-ink/80">
              <div className="flex justify-between gap-2"><dt>Dates</dt><dd>{fmtDay(booking.travelStart)} → {fmtDay(booking.travelEnd)}{booking.flexibleDates ? " (flexible)" : ""}</dd></div>
              <div className="flex justify-between gap-2"><dt>Party</dt><dd>{booking.adults} adult{booking.adults === 1 ? "" : "s"}{booking.children > 0 ? `, ${booking.children} child${booking.children === 1 ? "" : "ren"}${booking.childrenAges.length > 0 ? ` (${booking.childrenAges.join(", ")})` : ""}` : ""}{booking.infants > 0 ? `, ${booking.infants} infant${booking.infants === 1 ? "" : "s"}` : ""}</dd></div>
              <div className="flex justify-between gap-2"><dt>Flights</dt><dd>{[booking.arrivalFlight, booking.departureFlight].filter(Boolean).join(" / ") || "—"} {booking.airport ? `(${booking.airport})` : ""}</dd></div>
              <div className="flex justify-between gap-2"><dt>Pickup</dt><dd>{booking.pickupLocation ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Stay style</dt><dd>{booking.accommodationTier ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Budget</dt><dd>{booking.budgetRange ?? "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt>Interests</dt><dd>{booking.interests.join(", ") || "—"}</dd></div>
            </dl>
            {booking.specialRequests ? (
              <p className="type-small mt-3 rounded-[2px] bg-parchment px-3 py-2">
                <strong>Special requests:</strong> {booking.specialRequests}
              </p>
            ) : null}
            {booking.source === "CUSTOM" && booking.customItinerary ? (
              <details className="type-small mt-3">
                <summary className="cursor-pointer underline underline-offset-4">Custom design payload</summary>
                <pre className="mt-2 overflow-x-auto rounded-[2px] bg-ink px-3 py-2 text-[11px] text-ivory">{JSON.stringify(booking.customItinerary, null, 2)}</pre>
              </details>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <h3 className="type-h3">Service lines ({detailLines.length})</h3>
          <p className="type-small mt-1 text-ink/70">
            {workspace.finance ? (
              <>
                Cost, client price and margin per line. Totals: cost{" "}
                <strong className="type-numeric">{pricing.totalCostCents !== null ? formatMoney(pricing.totalCostCents, pricing.currency) : "—"}</strong> ·
                client <strong className="type-numeric">{formatMoney(pricing.totalClientCents, pricing.currency)}</strong> ·
                income <strong className="type-numeric">{pricing.totalIncomeCents !== null ? formatMoney(pricing.totalIncomeCents, pricing.currency) : "—"}</strong> ·
                margin {pricing.blendedMarginBps !== null ? formatPct(pricing.blendedMarginBps) : "—"}
              </>
            ) : (
              <>Client prices per line — cost and margin are finance-visible only.</>
            )}
          </p>
          {detailLines.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No service lines yet" description="Break the request into costed services below." />
            </div>
          ) : (
            <div className="mt-3">
              <DataTable caption="Service lines">
                <TableHead>
                  <TableHeaderCell>Service</TableHeaderCell>
                  <TableHeaderCell>Dates · Qty</TableHeaderCell>
                  <TableHeaderCell>Supplier</TableHeaderCell>
                  <TableHeaderCell>Cost</TableHeaderCell>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Margin</TableHeaderCell>
                  <TableHeaderCell>Lock</TableHeaderCell>
                  <TableHeaderCell><span className="sr-only">Actions</span></TableHeaderCell>
                </TableHead>
                <TableBody>
                  {detailLines.map((line) => (
                    <tr key={line.id}>
                      <TableCell>
                        {line.serviceName}
                        <span className="type-caption block text-ink/55">
                          {booking.reference}-S{line.seq} · {line.serviceType} · {line.markupSource.toLowerCase()} markup
                        </span>
                      </TableCell>
                      <TableCell>
                        {fmtDay(line.startsAt)} → {fmtDay(line.endsAt)} · ×{line.quantity}
                        <span className="type-caption block text-ink/55">{line.location ?? "no location"}</span>
                      </TableCell>
                      <TableCell>{line.supplier?.name ?? <span className="text-ink/55">unassigned</span>}</TableCell>
                      <TableCell>
                        {line.costCents !== null ? (
                          <span className="type-numeric">{formatMoney(line.costCents, line.currency)}</span>
                        ) : (
                          <span className="text-ink/55">Restricted</span>
                        )}
                      </TableCell>
                      <TableCell><span className="type-numeric">{formatMoney(line.clientPriceCents, line.currency)}</span></TableCell>
                      <TableCell>
                        {line.costCents !== null ? (
                          <>
                            <span className="type-numeric">{formatMoney(line.clientPriceCents - line.costCents, line.currency)}</span>
                            <span className="type-caption block text-ink/55">
                              {formatPct(line.clientPriceCents > 0 ? Math.round(((line.clientPriceCents - line.costCents) / line.clientPriceCents) * 10_000) : 0)}
                            </span>
                          </>
                        ) : (
                          <span className="text-ink/55">Restricted</span>
                        )}
                      </TableCell>
                      <TableCell>{line.lock ? <Badge tone="sand">{line.lock.status}</Badge> : <span className="text-ink/55">—</span>}</TableCell>
                      <TableCell><RemoveLineButton bookingId={booking.id} lineId={line.id} /></TableCell>
                    </tr>
                  ))}
                </TableBody>
              </DataTable>
              {detailLines
                .filter((line) => !line.supplierId && suggestions.get(line.id)?.length)
                .map((line) => (
                  <div key={line.id} className="type-small mt-3 rounded-[2px] border border-ink/10 px-3 py-2">
                    <p><strong>{line.serviceName}</strong> — matching suppliers:</p>
                    <ul className="mt-1 grid gap-1">
                      {(suggestions.get(line.id) ?? []).map((match) => (
                        <li key={match.rateId} className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {match.supplierName}{match.rating ? ` (${match.rating}/5)` : ""} ·{" "}
                            {match.costCents !== null ? (
                              <>{formatMoney(match.costCents, match.currency)} {match.unit.replaceAll("_", " ").toLowerCase()}</>
                            ) : (
                              <>{match.unit.replaceAll("_", " ").toLowerCase()} (cost restricted)</>
                            )}
                            {match.freeUnits !== null ? ` · ${match.freeUnits} free` : ""}
                          </span>
                          <AssignSupplierButton
                            bookingId={booking.id}
                            lineId={line.id}
                            supplierId={match.supplierId}
                            rateId={match.rateId}
                            label="Assign"
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
          <div className="mt-4">
            <ServiceLineForm bookingId={booking.id} />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="type-h3">Supplier locks ({locks.length})</h3>
            {locks.length === 0 ? (
              <p className="type-small mt-2 text-ink/60">No supplier requests yet. Requesting goes out in Phase 6.</p>
            ) : (
              <ul className="type-small mt-2 grid gap-2">
                {locks.map((lock) => (
                  <li key={lock.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
                    <span>
                      {lock.supplier.name} · {lock.serviceName} · ×{lock.quantity} · {fmtDay(lock.startsAt)} → {fmtDay(lock.endsAt)}
                    </span>
                    <Badge tone={lock.status === "CONFIRMED" || lock.status === "COMPLETED" ? "earth" : lock.status === "DECLINED" ? "clay" : "sand"}>
                      {lock.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="type-h3 mt-5">Crew & fleet (legacy)</h3>
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
                <li className="text-ink/60">Nothing assigned — supplier locks replace this.</li>
              ) : null}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Quote</h3>
            {booking.quoteVersions.length === 0 && !booking.quote ? (
              <p className="type-small mt-2 text-ink/60">
                No quote yet. Propose lines, hold suppliers, then generate the draft.
              </p>
            ) : null}
            {booking.quoteVersions.length > 0 ? (
              <ul className="type-small mt-2 grid gap-2">
                {booking.quoteVersions.slice(0, 5).map((version) => (
                  <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 pb-2">
                    <span>
                      <strong className="type-numeric">{booking.reference}-Q{version.version}</strong> ·{" "}
                      {version.status.toLowerCase()} ·{" "}
                      <span className="type-numeric">{formatMoney(version.totalCents, version.currency)}</span>
                      {version.discountCents > 0 ? ` (incl. ${formatMoney(version.discountCents, version.currency)} off)` : ""}
                      <span className="type-caption block text-ink/55">
                        valid to {fmtDay(version.validUntil)}
                        {version.revisionNotes ? ` · client asked: ${version.revisionNotes.slice(0, 120)}` : ""}
                      </span>
                    </span>
                    <span className="flex gap-2">
                      {version.status === "DRAFT" ? (
                        <QuoteActionButton bookingId={booking.id} action="approve" label="Approve" />
                      ) : null}
                      {version.status === "APPROVED" ? (
                        <QuoteActionButton bookingId={booking.id} action="send" label="Send to client" />
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <ProposeLinesButton bookingId={booking.id} />
              <RequestSuppliersButton bookingId={booking.id} />
              <DraftQuoteButton bookingId={booking.id} />
            </div>
            <div className="mt-3">
              <QuoteEditForm bookingId={booking.id} />
            </div>
            {booking.quote ? (
              <p className="type-small mt-3 text-ink/60">
                Legacy quote {booking.quote.number} ({booking.quote.status.toLowerCase()}) superseded by the marketplace flow.
              </p>
            ) : null}
            <h3 className="type-h3 mt-5">Payments</h3>
            <dl className="type-small mt-2 grid gap-1 text-ink/80">
              <div className="flex justify-between gap-2"><dt>Priced total</dt><dd className="type-numeric">{formatMoney(pricing.totalClientCents, pricing.currency)}</dd></div>
              <div className="flex justify-between gap-2"><dt>Deposit due (30%)</dt><dd className="type-numeric">{formatMoney(depositDue, pricing.currency)}</dd></div>
              <div className="flex justify-between gap-2"><dt>Received</dt><dd className="type-numeric">{formatMoney(paidCents, pricing.currency)}</dd></div>
              <div className="flex justify-between gap-2"><dt>Outstanding</dt><dd className="type-numeric">{formatMoney(outstanding, pricing.currency)}</dd></div>
            </dl>
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
              {invoices.length === 0 ? <li className="text-ink/60">None yet.</li> : null}
            </ul>
            <div className="mt-2">
              <InvoiceActions bookingId={booking.id} />
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
            <h3 className="type-h3 mt-5">Travellers ({booking.travellers.length})</h3>
            <ul className="type-small mt-2 grid gap-1">
              {booking.travellers.map((t) => (
                <li key={t.id}>
                  {t.fullName} · {t.kind}
                  {t.nationality ? ` · ${t.nationality}` : " · passport pending"}
                </li>
              ))}
              {booking.travellers.length === 0 ? <li className="text-ink/60">None listed.</li> : null}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h3 className="type-h3">Documents</h3>
            <ul className="type-small mt-2 grid gap-1">
              <li>
                <Link href={`/safari/${booking.reference}/confirmation`} className="underline underline-offset-4">
                  Booking confirmation (client view)
                </Link>
              </li>
              <li>
                <Link href={`/safari/${booking.reference}/itinerary`} className="underline underline-offset-4">
                  Trip itinerary (client view)
                </Link>
              </li>
              {documents.map((doc) => (
                <li key={doc.id}>
                  {doc.title} <span className="text-ink/55">({doc.kind})</span>
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <DocumentAttach bookingId={booking.id} />
            </div>
            <h3 className="type-h3 mt-5">Internal notes</h3>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h3 className="type-h3">Client thread</h3>
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
            <h3 className="type-h3">Timeline ({timeline.length})</h3>
            <ol className="type-small mt-2 grid max-h-96 gap-2 overflow-y-auto">
              {timeline.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="border-b border-ink/10 pb-2">
                  <span className="type-caption text-ink/55">
                    {new Date(entry.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{entry.kind}
                  </span>
                  <p><strong>{entry.title}</strong></p>
                  {entry.detail ? <p className="whitespace-pre-wrap text-ink/75">{entry.detail}</p> : null}
                </li>
              ))}
              {timeline.length === 0 ? <li className="text-ink/60">Nothing yet.</li> : null}
            </ol>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
