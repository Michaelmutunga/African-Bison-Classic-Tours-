import { Prisma, type BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { ConflictError, NotFoundError, type Actor } from "@/server/catalogue";
import { withResourceLock } from "@/server/bookings";

export class OperationsError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateOps(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

export async function recordAudit(
  actorId: string | null,
  action: string,
  resource: string,
  resourceId?: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: { actor: actorId ?? "system", action, resource, resourceId: resourceId ?? null },
  });
}

// ---------------------------------------------------------------------------
// Fleet
// ---------------------------------------------------------------------------

export const vehicleInput = z.object({
  registration: z.string().trim().min(2).max(40),
  type: z.string().trim().min(2).max(80),
  capacity: z.number().int().min(1).max(60),
  status: z.string().trim().max(20).default("active"),
  operator: z.string().trim().max(160).optional(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function createVehicle(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = vehicleInput.parse(input);
  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        registration: data.registration.toUpperCase(),
        type: data.type,
        capacity: data.capacity,
        status: data.status,
        operator: data.operator ?? null,
        location: data.location ?? null,
        notes: data.notes ?? null,
      },
    });
    await recordAudit(actor?.id ?? null, "vehicle.created", "vehicle", vehicle.id);
    return vehicle;
  } catch {
    throw new ConflictError(`Vehicle ${data.registration} already exists`);
  }
}

export async function updateVehicle(actor: Actor | null, id: string, input: unknown) {
  gateOps(actor);
  const data = vehicleInput.partial().parse(input);
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Vehicle");
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      ...data,
      ...(data.registration ? { registration: data.registration.toUpperCase() } : {}),
    },
  });
  await recordAudit(actor?.id ?? null, "vehicle.updated", "vehicle", id);
  return vehicle;
}

export async function listVehicles(actor: Actor | null, status?: string) {
  // Fleet data (and guide phone numbers below) is staff-only.
  gateStaffRead(actor);
  return prisma.vehicle.findMany({
    where: status ? { status } : undefined,
    orderBy: { registration: "asc" },
    include: { _count: { select: { assignments: true } } },
  });
}

export async function deleteVehicle(actor: Actor | null, id: string) {
  gateOps(actor);
  const assignments = await prisma.vehicleAssignment.count({ where: { vehicleId: id } });
  if (assignments > 0) {
    throw new ConflictError("Vehicle has assignments and cannot be deleted");
  }
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Vehicle");
  await prisma.vehicle.delete({ where: { id } });
  await recordAudit(actor?.id ?? null, "vehicle.deleted", "vehicle", id);
}

// ---------------------------------------------------------------------------
// Guides
// ---------------------------------------------------------------------------

export const guideInput = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional(),
  languages: z.array(z.string().trim().min(2).max(40)).max(12).default([]),
  specialisations: z.array(z.string().trim().min(2).max(80)).max(12).default([]),
  status: z.string().trim().max(20).default("active"),
  notes: z.string().trim().max(2000).optional(),
});

export async function createGuide(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = guideInput.parse(input);
  const guide = await prisma.guide.create({
    data: {
      name: data.name,
      phone: data.phone ?? null,
      languages: data.languages,
      specialisations: data.specialisations,
      status: data.status,
      notes: data.notes ?? null,
    },
  });
  await recordAudit(actor?.id ?? null, "guide.created", "guide", guide.id);
  return guide;
}

export async function updateGuide(actor: Actor | null, id: string, input: unknown) {
  gateOps(actor);
  const data = guideInput.partial().parse(input);
  const existing = await prisma.guide.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Guide");
  const guide = await prisma.guide.update({ where: { id }, data });
  await recordAudit(actor?.id ?? null, "guide.updated", "guide", id);
  return guide;
}

export async function listGuides(actor: Actor | null, status?: string) {
  gateStaffRead(actor);
  return prisma.guide.findMany({
    where: status ? { status } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function deleteGuide(actor: Actor | null, id: string) {
  gateOps(actor);
  const assignments = await prisma.guideAssignment.count({ where: { guideId: id } });
  if (assignments > 0) {
    throw new ConflictError("Guide has assignments and cannot be deleted");
  }
  const existing = await prisma.guide.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Guide");
  await prisma.guide.delete({ where: { id } });
  await recordAudit(actor?.id ?? null, "guide.deleted", "guide", id);
}

// ---------------------------------------------------------------------------
// Assignments with overlap conflict detection
// ---------------------------------------------------------------------------

export const assignmentInput = z.object({
  bookingId: z.string().cuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

function overlapWhere(startsAt: Date, endsAt: Date) {
  return { startsAt: { lt: endsAt }, endsAt: { gt: startsAt } };
}

export async function assignVehicle(
  actor: Actor | null,
  vehicleId: string,
  input: unknown,
) {
  gateOps(actor);
  const data = assignmentInput.parse(input);
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (!(startsAt < endsAt)) throw new OperationsError("Assignment must end after it starts");
  const [vehicle, booking] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.booking.findUnique({ where: { id: data.bookingId } }),
  ]);
  if (!vehicle) throw new NotFoundError("Vehicle");
  if (!booking) throw new NotFoundError("Booking");
  if (vehicle.status !== "active") throw new OperationsError("Vehicle is not active");

  return prisma.$transaction(async (tx) => {
    return withResourceLock(tx, "vehicle-assignment", vehicleId, async () => {
      const clash = await tx.vehicleAssignment.findFirst({
        where: { vehicleId, ...overlapWhere(startsAt, endsAt) },
        include: { booking: { select: { reference: true } } },
      });
      if (clash) {
        throw new ConflictError(
          `Vehicle is already assigned to ${clash.booking.reference} over that window`,
        );
      }
      const assignment = await tx.vehicleAssignment.create({
        data: { vehicleId, bookingId: booking.id, startsAt, endsAt, createdById: actor?.id ?? null },
      });
      await tx.auditLog.create({
        data: { actor: actor?.id ?? "system", action: "vehicle.assigned", resource: "booking", resourceId: booking.id },
      });
      return assignment;
    });
  });
}

export async function unassignVehicle(actor: Actor | null, assignmentId: string) {
  gateOps(actor);
  const existing = await prisma.vehicleAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing) throw new NotFoundError("Assignment");
  await prisma.vehicleAssignment.delete({ where: { id: assignmentId } });
  await recordAudit(actor?.id ?? null, "vehicle.unassigned", "booking", existing.bookingId);
}

export async function assignGuide(actor: Actor | null, guideId: string, input: unknown) {
  gateOps(actor);
  const data = assignmentInput.parse(input);
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (!(startsAt < endsAt)) throw new OperationsError("Assignment must end after it starts");
  const [guide, booking] = await Promise.all([
    prisma.guide.findUnique({ where: { id: guideId } }),
    prisma.booking.findUnique({ where: { id: data.bookingId } }),
  ]);
  if (!guide) throw new NotFoundError("Guide");
  if (!booking) throw new NotFoundError("Booking");
  if (guide.status !== "active") throw new OperationsError("Guide is not active");

  return prisma.$transaction(async (tx) => {
    return withResourceLock(tx, "guide-assignment", guideId, async () => {
      const clash = await tx.guideAssignment.findFirst({
        where: { guideId, ...overlapWhere(startsAt, endsAt) },
        include: { booking: { select: { reference: true } } },
      });
      if (clash) {
        throw new ConflictError(
          `Guide is already assigned to ${clash.booking.reference} over that window`,
        );
      }
      const assignment = await tx.guideAssignment.create({
        data: { guideId, bookingId: booking.id, startsAt, endsAt, createdById: actor?.id ?? null },
      });
      await tx.auditLog.create({
        data: { actor: actor?.id ?? "system", action: "guide.assigned", resource: "booking", resourceId: booking.id },
      });
      return assignment;
    });
  });
}

export async function unassignGuide(actor: Actor | null, assignmentId: string) {
  gateOps(actor);
  const existing = await prisma.guideAssignment.findUnique({ where: { id: assignmentId } });
  if (!existing) throw new NotFoundError("Assignment");
  await prisma.guideAssignment.delete({ where: { id: assignmentId } });
  await recordAudit(actor?.id ?? null, "guide.unassigned", "booking", existing.bookingId);
}

// ---------------------------------------------------------------------------
// Transfers
// ---------------------------------------------------------------------------

export const transferInput = z.object({
  bookingId: z.string().cuid().nullable().optional(),
  pickup: z.string().trim().min(2).max(200),
  dropoff: z.string().trim().min(2).max(200),
  scheduledAt: z.string().datetime(),
  passengers: z.number().int().min(1).max(60).default(1),
  vehicleId: z.string().cuid().nullable().optional(),
  guideId: z.string().cuid().nullable().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
  notes: z.string().trim().max(2000).optional(),
});

export async function createTransfer(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = transferInput.parse(input);
  if (data.bookingId) {
    const booking = await prisma.booking.findUnique({ where: { id: data.bookingId } });
    if (!booking) throw new NotFoundError("Booking");
  }
  const transfer = await prisma.transfer.create({
    data: {
      bookingId: data.bookingId ?? null,
      pickup: data.pickup,
      dropoff: data.dropoff,
      scheduledAt: new Date(data.scheduledAt),
      passengers: data.passengers,
      vehicleId: data.vehicleId ?? null,
      guideId: data.guideId ?? null,
      status: data.status,
      notes: data.notes ?? null,
      createdById: actor?.id ?? null,
    },
    include: { booking: { select: { reference: true } } },
  });
  await recordAudit(actor?.id ?? null, "transfer.created", "transfer", transfer.id);
  return transfer;
}

export async function updateTransfer(actor: Actor | null, id: string, input: unknown) {
  gateOps(actor);
  const data = transferInput.partial().parse(input);
  const existing = await prisma.transfer.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Transfer");
  const transfer = await prisma.transfer.update({
    where: { id },
    data: {
      ...data,
      ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
    },
  });
  await recordAudit(actor?.id ?? null, "transfer.updated", "transfer", id);
  return transfer;
}

export async function listTransfers(actor: Actor | null, from: Date, to: Date, status?: string) {
  gateStaffRead(actor);
  return prisma.transfer.findMany({
    where: { scheduledAt: { gte: from, lt: to }, ...(status ? { status } : {}) },
    orderBy: { scheduledAt: "asc" },
    include: {
      booking: { select: { reference: true } },
      vehicle: { select: { registration: true } },
      guide: { select: { name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Internal notes
// ---------------------------------------------------------------------------

export async function addInternalNote(actor: Actor | null, bookingId: string, body: string) {
  gateOps(actor);
  const clean = body.trim();
  if (clean.length < 2 || clean.length > 4000) throw new OperationsError("Note must be 2–4000 characters");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking");
  return prisma.internalNote.create({
    data: { bookingId, authorId: actor?.id ?? null, body: clean },
  });
}

export async function listInternalNotes(actor: Actor | null, bookingId: string) {
  gateStaffRead(actor);
  return prisma.internalNote.findMany({
    where: { bookingId },
    orderBy: { createdAt: "desc" },
  });
}

function gateStaffRead(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

function invoiceNumber(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `INV-${new Date().getFullYear()}-${suffix}`;
}

export async function generateInvoice(actor: Actor | null, bookingId: string) {
  gateOps(actor);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { quote: { include: { items: true } } },
  });
  if (!booking) throw new NotFoundError("Booking");
  const lines =
    booking.quote?.items.map((item) => ({
      label: item.label,
      quantity: item.quantity,
      unitCents: item.unitCents,
      totalCents: item.totalCents,
    })) ?? [
      {
        label: booking.tourId ? "Safari total" : "Custom journey total",
        quantity: 1,
        unitCents: booking.totalCents,
        totalCents: booking.totalCents,
      },
    ];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const invoice = await prisma.invoice.create({
        data: {
          number: invoiceNumber(),
          bookingId: booking.id,
          currency: booking.currency,
          subtotalCents: booking.subtotalCents,
          discountCents: booking.discountCents,
          totalCents: booking.totalCents,
          status: "DRAFT",
          snapshot: { bookingTotalCents: booking.totalCents, paidCents: booking.paidCents },
          createdById: actor?.id ?? null,
          items: { create: lines },
        },
        include: { items: true },
      });
      await recordAudit(actor?.id ?? null, "invoice.generated", "invoice", invoice.id);
      return invoice;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new ConflictError("Could not generate a unique invoice number");
}

const INVOICE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT", "VOID"],
  SENT: ["PAID", "VOID"],
  PAID: [],
  VOID: [],
};

export async function setInvoiceStatus(actor: Actor | null, id: string, status: "DRAFT" | "SENT" | "PAID" | "VOID") {
  gateOps(actor);
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new NotFoundError("Invoice");
  if (!INVOICE_TRANSITIONS[invoice.status].includes(status)) {
    throw new OperationsError(`Cannot move invoice from ${invoice.status} to ${status}`);
  }
  const updated = await prisma.invoice.update({ where: { id }, data: { status } });
  await recordAudit(actor?.id ?? null, `invoice.${status.toLowerCase()}`, "invoice", id);
  return updated;
}

export async function listInvoices(actor: Actor | null, status?: string) {
  gateStaffRead(actor);
  return prisma.invoice.findMany({
    where: status ? { status: status as "DRAFT" | "SENT" | "PAID" | "VOID" } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { booking: { select: { reference: true } } },
  });
}

// ---------------------------------------------------------------------------
// Dashboard, calendar, audit
// ---------------------------------------------------------------------------

export interface DashboardStats {
  activeBookings: number;
  arrivalsToday: number;
  departuresToday: number;
  transfersToday: number;
  vehiclesInUse: number;
  guidesOnDuty: number;
  holdsExpiring: number;
  pipeline: { status: string; count: number }[];
  revenue30d: number;
  outstandingCents: number;
}

const TERMINAL_BOOKING: BookingStatus[] = ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"];

function dayRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function dashboardStats(actor: Actor | null, now: Date = new Date()): Promise<DashboardStats> {
  gateStaffRead(actor);
  const { start, end } = dayRange(now);
  const soon = new Date(now.getTime() + 48 * 3600_000);
  const [activeBookings, arrivalsToday, departuresToday, transfersToday, vehiclesInUse, guidesOnDuty, holdsExpiring, pipeline, payments, open] =
    await Promise.all([
      prisma.booking.count({ where: { status: { notIn: TERMINAL_BOOKING } } }),
      prisma.booking.count({ where: { travelStart: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "EXPIRED"] } } }),
      prisma.booking.count({ where: { travelEnd: { gte: start, lt: end }, status: { notIn: ["CANCELLED", "EXPIRED"] } } }),
      prisma.transfer.count({ where: { scheduledAt: { gte: start, lt: end }, status: { not: "cancelled" } } }),
      prisma.vehicleAssignment.count({ where: { startsAt: { lt: end }, endsAt: { gt: start } } }),
      prisma.guideAssignment.count({ where: { startsAt: { lt: end }, endsAt: { gt: start } } }),
      prisma.hold.count({ where: { status: "ACTIVE", expiresAt: { lt: soon } } }),
      prisma.booking.groupBy({ by: ["status"], _count: true }),
      prisma.payment.findMany({
        where: { status: "SUCCEEDED", createdAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } },
        select: { amountCents: true },
      }),
      prisma.booking.findMany({
        where: { status: { notIn: TERMINAL_BOOKING } },
        select: { totalCents: true, paidCents: true },
        take: 500,
      }),
    ]);
  return {
    activeBookings,
    arrivalsToday,
    departuresToday,
    transfersToday,
    vehiclesInUse,
    guidesOnDuty,
    holdsExpiring,
    pipeline: pipeline.map((p) => ({ status: p.status, count: p._count })),
    revenue30d: payments.reduce((sum, p) => sum + p.amountCents, 0),
    outstandingCents: open.reduce((sum, b) => sum + Math.max(0, b.totalCents - b.paidCents), 0),
  };
}

export interface CalendarEvent {
  id: string;
  kind: "booking" | "transfer" | "hold";
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  reference?: string;
}

export async function calendarEvents(
  actor: Actor | null,
  from: Date,
  to: Date,
): Promise<{ events: CalendarEvent[]; conflicts: { resource: string; a: string; b: string }[] }> {
  gateStaffRead(actor);
  const [bookings, transfers, holds, vehicleAssignments, guideAssignments] = await Promise.all([
    prisma.booking.findMany({
      where: {
        travelStart: { lt: to },
        travelEnd: { gt: from },
        status: { notIn: ["CANCELLED", "EXPIRED"] },
      },
      select: { id: true, reference: true, status: true, travelStart: true, travelEnd: true, customerName: true },
    }),
    listTransfers(actor, from, to),
    prisma.hold.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from }, status: "ACTIVE" },
      select: { id: true, resourceType: true, resourceId: true, startsAt: true, endsAt: true, bookingId: true },
    }),
    prisma.vehicleAssignment.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from } },
      include: { vehicle: { select: { registration: true } }, booking: { select: { reference: true } } },
    }),
    prisma.guideAssignment.findMany({
      where: { startsAt: { lt: to }, endsAt: { gt: from } },
      include: { guide: { select: { name: true } }, booking: { select: { reference: true } } },
    }),
  ]);

  const events: CalendarEvent[] = [
    ...bookings
      .filter((b) => b.travelStart && b.travelEnd)
      .map((b) => ({
        id: `booking-${b.id}`,
        kind: "booking" as const,
        title: `${b.reference} · ${b.customerName}`,
        startsAt: (b.travelStart as Date).toISOString(),
        endsAt: (b.travelEnd as Date).toISOString(),
        status: b.status,
        reference: b.reference,
      })),
    ...transfers.map((t) => ({
      id: `transfer-${t.id}`,
      kind: "transfer" as const,
      title: `${t.pickup} → ${t.dropoff} (${t.passengers})`,
      startsAt: t.scheduledAt.toISOString(),
      endsAt: t.scheduledAt.toISOString(),
      status: t.status,
      reference: t.booking?.reference,
    })),
    ...holds.map((h) => ({
      id: `hold-${h.id}`,
      kind: "hold" as const,
      title: `${h.resourceType}:${h.resourceId} held`,
      startsAt: h.startsAt.toISOString(),
      endsAt: h.endsAt.toISOString(),
      status: "ACTIVE",
    })),
  ];

  // Conflicts: overlapping assignments on the same vehicle or guide.
  const conflicts: { resource: string; a: string; b: string }[] = [];
  const check = (
    rows: { id: string; startsAt: Date; endsAt: Date; label: string; resource: string }[],
  ) => {
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i];
        const b = rows[j];
        if (!a || !b || a.resource !== b.resource) continue;
        if (a.startsAt < b.endsAt && b.startsAt < a.endsAt) {
          conflicts.push({ resource: a.resource, a: a.label, b: b.label });
        }
      }
    }
  };
  check(
    vehicleAssignments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      label: a.booking.reference,
      resource: `vehicle:${a.vehicle.registration}`,
    })),
  );
  check(
    guideAssignments.map((a) => ({
      id: a.id,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      label: a.booking.reference,
      resource: `guide:${a.guide.name}`,
    })),
  );

  return { events, conflicts };
}

export async function listAuditLogs(
  actor: Actor | null,
  options: { resource?: string; take?: number } = {},
) {
  gateStaffRead(actor);
  return prisma.auditLog.findMany({
    where: options.resource ? { resource: options.resource } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(options.take ?? 100, 200),
  });
}

export async function listTravellers(
  actor: Actor | null,
  options: { search?: string; bookingId?: string } = {},
) {
  gateStaffRead(actor);
  return prisma.bookingTraveller.findMany({
    where: {
      ...(options.bookingId ? { bookingId: options.bookingId } : {}),
      ...(options.search
        ? { fullName: { contains: options.search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { booking: { select: { reference: true, status: true } } },
  });
}
