import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { NotFoundError, type Actor } from "@/server/catalogue";
import { bookingPricingSummary } from "@/server/marketplace-pricing";
import { formatMoney } from "@/lib/money";

/**
 * Admin booking workspace (Phase 5). One loader for the whole detail
 * screen plus the merged timeline feed and inbox action counters.
 */

function gateStaff(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

export interface TimelineEntry {
  at: string;
  kind: "status" | "audit" | "message" | "note" | "payment" | "lock";
  title: string;
  detail: string | null;
}

export async function bookingTimeline(actor: Actor | null, bookingId: string): Promise<TimelineEntry[]> {
  gateStaff(actor);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      history: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
      notes: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking) throw new NotFoundError("Booking");

  const locks = await prisma.supplierLock.findMany({
    where: { bookingRef: booking.reference },
    select: { id: true },
  });
  const audits = await prisma.auditLog.findMany({
    where: {
      OR: [
        { resource: "booking", resourceId: bookingId },
        { resource: "supplier-lock", resourceId: { in: locks.map((l) => l.id) } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  const entries: TimelineEntry[] = [
    ...booking.history.map((h) => ({
      at: h.createdAt.toISOString(),
      kind: "status" as const,
      title: h.from ? `${h.from.replaceAll("_", " ")} → ${h.to.replaceAll("_", " ")}` : `Opened as ${h.to.replaceAll("_", " ")}`,
      detail: h.reason,
    })),
    ...audits.map((a) => ({
      at: a.createdAt.toISOString(),
      kind: (a.resource === "supplier-lock" ? "lock" : "audit") as TimelineEntry["kind"],
      title: a.action,
      detail: null,
    })),
    ...booking.messages.map((m) => ({
      at: m.createdAt.toISOString(),
      kind: "message" as const,
      title: m.authorRole === "staff" ? "Team wrote to client" : "Client wrote",
      detail: m.body,
    })),
    ...booking.notes.map((n) => ({
      at: n.createdAt.toISOString(),
      kind: "note" as const,
      title: "Internal note",
      detail: n.body,
    })),
    ...booking.payments.map((p) => ({
      at: p.createdAt.toISOString(),
      kind: "payment" as const,
      title: `${p.kind.toLowerCase()} ${formatMoney(p.amountCents, p.currency)} — ${p.status.toLowerCase()}`,
      detail: null,
    })),
  ];
  entries.sort((a, b) => a.at.localeCompare(b.at));
  return entries;
}

export async function bookingWorkspace(actor: Actor | null, id: string) {
  gateStaff(actor);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      tour: { select: { slug: true, title: true, durationDays: true } },
      travellers: { orderBy: { createdAt: "asc" } },
      history: { orderBy: { createdAt: "asc" } },
      assignedAdmin: { select: { id: true, name: true, email: true, role: true } },
      quote: { include: { items: true } },
      serviceLines: {
        orderBy: { seq: "asc" },
        include: { supplier: { select: { id: true, name: true, status: true, rating: true } }, rate: true, lock: true },
      },
    },
  });
  if (!booking) throw new NotFoundError("Booking");

  const [pricing, payments, invoices, documents, messages, notes, locks, timeline, pastBookings] = await Promise.all([
    bookingPricingSummary(actor, id),
    prisma.payment.findMany({ where: { bookingId: id }, orderBy: { createdAt: "asc" }, include: { refunds: true } }),
    prisma.invoice.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    prisma.document.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" } }),
    prisma.customerMessage.findMany({ where: { bookingId: id }, orderBy: { createdAt: "asc" } }),
    prisma.internalNote.findMany({ where: { bookingId: id }, orderBy: { createdAt: "desc" } }),
    prisma.supplierLock.findMany({
      where: { bookingRef: booking.reference },
      orderBy: { startsAt: "asc" },
      include: { supplier: { select: { id: true, name: true } }, rate: true },
    }),
    bookingTimeline(actor, id),
    prisma.booking.findMany({
      where: { customerEmail: booking.customerEmail, id: { not: id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, reference: true, status: true, createdAt: true, totalCents: true, currency: true },
    }),
  ]);

  const paid = payments
    .filter((p) => p.status === "SUCCEEDED")
    .reduce((sum, p) => sum + p.amountCents, 0);
  return { booking, pricing, payments, invoices, documents, messages, notes, locks, timeline, pastBookings, paidCents: paid };
}

export async function listStaff(actor: Actor | null) {
  gateStaff(actor);
  return prisma.user.findMany({
    where: { role: { not: "CUSTOMER" }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  });
}

// ---------------------------------------------------------------------------
// Inbox: needs-action counters for the dashboard and booking pipeline.
// ---------------------------------------------------------------------------

export interface InboxCounts {
  newRequests: number;
  quotesAwaiting: number;
  supplierReplies: number;
  paymentsOverdue: number;
  tripsSoon: { id: string; reference: string; detail: string }[];
}

export async function inboxCounts(actor: Actor | null, now: Date = new Date()): Promise<InboxCounts> {
  gateStaff(actor);
  const overdueCutoff = new Date(now.getTime() - 3 * 86_400_000);
  const soonCutoff = new Date(now.getTime() + 14 * 86_400_000);
  const [newRequests, quotesAwaiting, supplierReplies, paymentsOverdue, soon] = await Promise.all([
    prisma.booking.count({ where: { status: "NEW" } }),
    prisma.booking.count({ where: { status: "QUOTE_SENT" } }),
    prisma.supplierLock.count({ where: { status: "REQUESTED" } }),
    prisma.booking.count({ where: { status: "AWAITING_DEPOSIT", createdAt: { lt: overdueCutoff } } }),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PRE_TRIP", "ON_SAFARI"] },
        travelStart: { gte: now, lt: soonCutoff },
      },
      orderBy: { travelStart: "asc" },
      take: 8,
      select: { id: true, reference: true, travelStart: true, customerName: true },
    }),
  ]);
  return {
    newRequests,
    quotesAwaiting,
    supplierReplies,
    paymentsOverdue,
    tripsSoon: soon.map((b) => ({
      id: b.id,
      reference: b.reference,
      detail: `${b.customerName} · starts ${b.travelStart?.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`,
    })),
  };
}
