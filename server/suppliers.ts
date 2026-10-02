import { Prisma, type BookingStatus, type SupplierLockStatus, type SupplierStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { ConflictError, NotFoundError, slugify, type Actor } from "@/server/catalogue";
import { recordAudit } from "@/server/operations";
import {
  decryptSecret,
  encryptSecret,
  hashSupplierToken,
  mintSupplierToken,
  tokensEqual,
} from "@/lib/supplier-secrets";
import { withResourceLock } from "@/server/bookings";

export class SupplierError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateOps(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

/** Only finance-visible roles may decrypt payout details. */
function gateFinance(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "ADMIN" && actor.role !== "FINANCE_USER") {
    throw new ForbiddenError("bookings.write");
  }
}

// ---------------------------------------------------------------------------
// Supplier types (admin-managed)
// ---------------------------------------------------------------------------

export const DEFAULT_SUPPLIER_TYPES = [
  { slug: "airport-transfer", name: "Airport pickup / transfer" },
  { slug: "hotel-lodge-camp", name: "Hotel / lodge / camp" },
  { slug: "driver-guide", name: "Driver-guide" },
  { slug: "vehicle-hire", name: "Vehicle hire" },
  { slug: "park-activity-operator", name: "Park / activity operator" },
  { slug: "flights-charters", name: "Flights / charters" },
  { slug: "other", name: "Other" },
] as const;

export const supplierTypeInput = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().max(80).optional(),
});

export async function listSupplierTypes(actor: Actor | null, activeOnly = false) {
  gateOps(actor);
  return prisma.supplierType.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function createSupplierType(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = supplierTypeInput.parse(input);
  const slug = data.slug ? slugify(data.slug) : slugify(data.name);
  try {
    const type = await prisma.supplierType.create({ data: { slug, name: data.name } });
    await recordAudit(actor?.id ?? null, "supplier-type.created", "supplier-type", type.id);
    return type;
  } catch {
    throw new ConflictError(`Supplier type "${slug}" already exists`);
  }
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

export const SUPPLIER_STATUSES: SupplierStatus[] = ["ACTIVE", "PAUSED", "BLACKLISTED"];

export const supplierInput = z.object({
  name: z.string().trim().min(2).max(160),
  typeSlugs: z.array(z.string().trim().min(2).max(80)).max(10).default([]),
  contactPerson: z.string().trim().max(160).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(254).optional(),
  coverageAreas: z.array(z.string().trim().min(2).max(80)).max(20).default([]),
  status: z.enum(["ACTIVE", "PAUSED", "BLACKLISTED"]).default("ACTIVE"),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  notes: z.string().trim().max(4000).optional(),
  paymentTerms: z.string().trim().max(2000).optional(),
  // Raw bank/M-Pesa details — encrypted before storage, never returned.
  payoutDetails: z.string().trim().max(2000).optional(),
  payoutHint: z.string().trim().max(120).optional(),
});

const supplierPublicSelect = {
  id: true,
  name: true,
  contactPerson: true,
  phone: true,
  whatsapp: true,
  email: true,
  coverageAreas: true,
  status: true,
  rating: true,
  notes: true,
  paymentTerms: true,
  payoutHint: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierSelect;

async function resolveTypes(slugs: string[]) {
  if (slugs.length === 0) return [];
  const found = await prisma.supplierType.findMany({ where: { slug: { in: slugs } } });
  const missing = slugs.filter((s) => !found.some((t) => t.slug === s));
  if (missing.length > 0) throw new SupplierError(`Unknown supplier type(s): ${missing.join(", ")}`);
  return found.map((t) => ({ id: t.id }));
}

export async function createSupplier(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = supplierInput.parse(input);
  const types = await resolveTypes(data.typeSlugs);
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      contactPerson: data.contactPerson ?? null,
      phone: data.phone ?? null,
      whatsapp: data.whatsapp ?? null,
      email: data.email ? data.email.toLowerCase() : null,
      coverageAreas: data.coverageAreas,
      status: data.status,
      rating: data.rating ?? null,
      notes: data.notes ?? null,
      paymentTerms: data.paymentTerms ?? null,
      payoutCiphertext: data.payoutDetails ? encryptSecret(data.payoutDetails) : null,
      payoutHint: data.payoutHint ?? null,
      types: { connect: types },
    },
    select: { ...supplierPublicSelect, types: true },
  });
  await recordAudit(actor?.id ?? null, "supplier.created", "supplier", supplier.id);
  return supplier;
}

export async function updateSupplier(actor: Actor | null, id: string, input: unknown) {
  gateOps(actor);
  const data = supplierInput.partial().parse(input);
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError("Supplier");
  const types = data.typeSlugs ? await resolveTypes(data.typeSlugs) : null;
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.contactPerson !== undefined ? { contactPerson: data.contactPerson ?? null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
      ...(data.whatsapp !== undefined ? { whatsapp: data.whatsapp ?? null } : {}),
      ...(data.email !== undefined ? { email: data.email ? data.email.toLowerCase() : null } : {}),
      ...(data.coverageAreas !== undefined ? { coverageAreas: data.coverageAreas } : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
      ...(data.rating !== undefined ? { rating: data.rating } : {}),
      ...(data.notes !== undefined ? { notes: data.notes ?? null } : {}),
      ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms ?? null } : {}),
      // Rotating payout details re-encrypts; omitting the field keeps them.
      ...(data.payoutDetails !== undefined
        ? { payoutCiphertext: data.payoutDetails ? encryptSecret(data.payoutDetails) : null }
        : {}),
      ...(data.payoutHint !== undefined ? { payoutHint: data.payoutHint ?? null } : {}),
      ...(types ? { types: { set: types } } : {}),
    },
    select: { ...supplierPublicSelect, types: true },
  });
  await recordAudit(actor?.id ?? null, "supplier.updated", "supplier", id);
  return supplier;
}

export async function getSupplier(actor: Actor | null, id: string) {
  gateOps(actor);
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: {
      ...supplierPublicSelect,
      types: true,
      documents: { orderBy: { createdAt: "asc" } },
      rates: { orderBy: [{ serviceSlug: "asc" }, { version: "desc" }] },
      _count: { select: { locks: true } },
    },
  });
  if (!supplier) throw new NotFoundError("Supplier");
  return supplier;
}

export async function listSuppliers(
  actor: Actor | null,
  options: { status?: SupplierStatus; type?: string; search?: string } = {},
) {
  gateOps(actor);
  const term = options.search?.trim();
  const suppliers = await prisma.supplier.findMany({
    where: {
      ...(options.status ? { status: options.status } : {}),
      ...(options.type ? { types: { some: { slug: options.type } } } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { coverageAreas: { has: term } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
    select: { ...supplierPublicSelect, types: true, _count: { select: { locks: true, rates: true } } },
  });
  return suppliers;
}

/** Decrypt payout details. Finance roles only; access is audit-logged. */
export async function revealSupplierPayout(actor: Actor | null, id: string) {
  gateFinance(actor);
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) throw new NotFoundError("Supplier");
  if (!supplier.payoutCiphertext) throw new NotFoundError("Payout details");
  await recordAudit(actor?.id ?? null, "supplier.payout.revealed", "supplier", id);
  return {
    supplierId: id,
    payoutHint: supplier.payoutHint,
    payoutDetails: decryptSecret(supplier.payoutCiphertext),
  };
}

export const supplierDocumentInput = z.object({
  kind: z.string().trim().min(2).max(60),
  title: z.string().trim().min(2).max(200),
  url: z.string().trim().url().max(2000).optional(),
});

export async function addSupplierDocument(actor: Actor | null, supplierId: string, input: unknown) {
  gateOps(actor);
  const data = supplierDocumentInput.parse(input);
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new NotFoundError("Supplier");
  const doc = await prisma.supplierDocument.create({
    data: { supplierId, kind: data.kind, title: data.title, url: data.url ?? null },
  });
  await recordAudit(actor?.id ?? null, "supplier.document.added", "supplier", supplierId);
  return doc;
}

// ---------------------------------------------------------------------------
// Rate cards (versioned; bookings pin the costed version)
// ---------------------------------------------------------------------------

export const RATE_UNITS = [
  "PER_VEHICLE_PER_DAY",
  "PER_PERSON_PER_NIGHT",
  "PER_TRANSFER",
  "PER_ACTIVITY",
  "PER_GROUP",
] as const;

const mmdd = z.string().regex(/^\d{2}-\d{2}$/, "Season bounds are MM-DD");

export const supplierRateInput = z.object({
  serviceSlug: z.string().trim().min(2).max(120).optional(),
  serviceName: z.string().trim().min(2).max(160),
  serviceType: z.string().trim().min(2).max(80),
  unit: z.enum(RATE_UNITS),
  currency: z.enum(["KES", "USD"]).default("USD"),
  costCents: z.number().int().min(0).max(100_000_000),
  season: z.enum(["low", "high", "peak"]).nullable().optional(),
  seasonStart: mmdd.nullable().optional(),
  seasonEnd: mmdd.nullable().optional(),
  capacity: z.number().int().min(1).max(1000).nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validTo: z.string().datetime().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function createSupplierRate(actor: Actor | null, supplierId: string, input: unknown) {
  gateOps(actor);
  const data = supplierRateInput.parse(input);
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new NotFoundError("Supplier");
  const type = await prisma.supplierType.findUnique({ where: { slug: data.serviceType } });
  if (!type) throw new SupplierError(`Unknown supplier type: ${data.serviceType}`);
  const serviceSlug = data.serviceSlug ? slugify(data.serviceSlug) : slugify(data.serviceName);
  try {
    const rate = await prisma.supplierRate.create({
      data: {
        supplierId,
        serviceSlug,
        serviceName: data.serviceName,
        serviceType: data.serviceType,
        unit: data.unit,
        currency: data.currency,
        costCents: data.costCents,
        season: data.season ?? null,
        seasonStart: data.seasonStart ?? null,
        seasonEnd: data.seasonEnd ?? null,
        capacity: data.capacity ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validTo: data.validTo ? new Date(data.validTo) : null,
        version: 1,
        notes: data.notes ?? null,
      },
    });
    await recordAudit(actor?.id ?? null, "supplier-rate.created", "supplier", supplierId);
    return rate;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError(`Rate "${serviceSlug}" already exists for this supplier`);
    }
    throw error;
  }
}

/**
 * Price change: closes the current version (validTo = now) and mints a new
 * version row. Existing locks keep pointing at their pinned version.
 */
export async function updateSupplierRate(actor: Actor | null, rateId: string, input: unknown) {
  gateOps(actor);
  const data = supplierRateInput.partial().parse(input);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const current = await tx.supplierRate.findUnique({ where: { id: rateId } });
    if (!current) throw new NotFoundError("Rate");
    if (current.validTo && current.validTo <= now) {
      throw new SupplierError("This rate version is closed; update the current version instead");
    }
    if (data.serviceType) {
      const type = await tx.supplierType.findUnique({ where: { slug: data.serviceType } });
      if (!type) throw new SupplierError(`Unknown supplier type: ${data.serviceType}`);
    }
    await tx.supplierRate.update({ where: { id: rateId }, data: { validTo: now } });
    const next = await tx.supplierRate.create({
      data: {
        supplierId: current.supplierId,
        serviceSlug: current.serviceSlug,
        serviceName: data.serviceName ?? current.serviceName,
        serviceType: data.serviceType ?? current.serviceType,
        unit: data.unit ?? current.unit,
        currency: data.currency ?? current.currency,
        costCents: data.costCents ?? current.costCents,
        season: data.season !== undefined ? data.season : current.season,
        seasonStart: data.seasonStart !== undefined ? data.seasonStart : current.seasonStart,
        seasonEnd: data.seasonEnd !== undefined ? data.seasonEnd : current.seasonEnd,
        capacity: data.capacity !== undefined ? data.capacity : current.capacity,
        validFrom: now,
        validTo: null,
        version: current.version + 1,
        supersedesId: current.id,
        notes: data.notes !== undefined ? data.notes ?? null : current.notes,
      },
    });
    await tx.auditLog.create({
      data: {
        actor: actor?.id ?? "system",
        action: "supplier-rate.updated",
        resource: "supplier",
        resourceId: current.supplierId,
      },
    });
    return next;
  });
}

export async function listSupplierRates(actor: Actor | null, supplierId: string, currentOnly = true) {
  gateOps(actor);
  return prisma.supplierRate.findMany({
    where: { supplierId, ...(currentOnly ? { validTo: null } : {}) },
    orderBy: [{ serviceSlug: "asc" }, { version: "desc" }],
  });
}

// ---------------------------------------------------------------------------
// Supplier locks (availability + commitment per booking service)
// ---------------------------------------------------------------------------

export const LOCK_TRANSITIONS: Record<SupplierLockStatus, SupplierLockStatus[]> = {
  REQUESTED: ["HELD", "DECLINED", "RELEASED"],
  HELD: ["CONFIRMED", "DECLINED", "RELEASED", "REQUESTED"],
  CONFIRMED: ["COMPLETED", "RELEASED"],
  DECLINED: ["REQUESTED", "RELEASED"],
  RELEASED: [],
  COMPLETED: [],
};

/** Locks that consume capacity. */
const OCCUPYING: SupplierLockStatus[] = ["REQUESTED", "HELD", "CONFIRMED"];

export const supplierLockInput = z.object({
  rateId: z.string().cuid(),
  bookingRef: z.string().trim().max(40).optional(),
  serviceRef: z.string().trim().max(60).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  quantity: z.number().int().min(1).max(1000).default(1),
  notes: z.string().trim().max(2000).optional(),
});

type LockTx = Prisma.TransactionClient;

async function occupyingUsage(
  tx: LockTx,
  supplierId: string,
  serviceSlug: string,
  startsAt: Date,
  endsAt: Date,
  excludeLockId?: string,
): Promise<number> {
  const locks = await tx.supplierLock.findMany({
    where: {
      supplierId,
      status: { in: OCCUPYING },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      rate: { serviceSlug },
      ...(excludeLockId ? { id: { not: excludeLockId } } : {}),
    },
    select: { quantity: true },
  });
  return locks.reduce((sum, lock) => sum + lock.quantity, 0);
}

export async function createSupplierLock(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = supplierLockInput.parse(input);
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (!(startsAt < endsAt)) throw new SupplierError("Lock must end after it starts");

  return prisma.$transaction(async (tx) => {
    const rate = await tx.supplierRate.findUnique({
      where: { id: data.rateId },
      include: { supplier: true },
    });
    if (!rate) throw new NotFoundError("Rate");
    if (rate.supplier.status !== "ACTIVE") {
      throw new SupplierError(`Supplier ${rate.supplier.name} is ${rate.supplier.status.toLowerCase()}`);
    }
    return withResourceLock(tx, "supplier-lock", `${rate.supplierId}:${rate.serviceSlug}`, async () => {
      if (rate.capacity !== null) {
        const used = await occupyingUsage(tx, rate.supplierId, rate.serviceSlug, startsAt, endsAt);
        if (used + data.quantity > rate.capacity) {
          throw new ConflictError(
            `${rate.supplier.name} has ${rate.capacity - used} unit(s) of ${rate.serviceName} free over those dates`,
          );
        }
      }
      const lock = await tx.supplierLock.create({
        data: {
          supplierId: rate.supplierId,
          rateId: rate.id,
          bookingRef: data.bookingRef ?? null,
          serviceRef: data.serviceRef ?? null,
          serviceName: rate.serviceName,
          serviceType: rate.serviceType,
          startsAt,
          endsAt,
          quantity: data.quantity,
          status: "REQUESTED",
          notes: data.notes ?? null,
          createdById: actor?.id ?? null,
        },
        include: { supplier: { select: { name: true } }, rate: true },
      });
      await tx.auditLog.create({
        data: {
          actor: actor?.id ?? "system",
          action: "supplier-lock.created",
          resource: "supplier-lock",
          resourceId: lock.id,
        },
      });
      return lock;
    });
  });
}

export async function setSupplierLockStatus(
  actor: Actor | null,
  id: string,
  to: SupplierLockStatus,
  reason?: string,
) {
  gateOps(actor);
  return prisma.$transaction(async (tx) => {
    const lock = await tx.supplierLock.findUnique({ where: { id }, include: { rate: true } });
    if (!lock) throw new NotFoundError("Supplier lock");
    if (!LOCK_TRANSITIONS[lock.status].includes(to)) {
      throw new SupplierError(`Cannot move supplier lock from ${lock.status} to ${to}`);
    }
    // Re-check capacity when (re-)entering an occupying state.
    if (OCCUPYING.includes(to) && !OCCUPYING.includes(lock.status) && lock.rate?.capacity !== null) {
      const used = await occupyingUsage(
        tx,
        lock.supplierId,
        lock.rate?.serviceSlug ?? "",
        lock.startsAt,
        lock.endsAt,
        lock.id,
      );
      if (used + lock.quantity > (lock.rate?.capacity ?? 0)) {
        throw new ConflictError("Supplier capacity changed while this lock was released");
      }
    }
    const updated = await tx.supplierLock.update({ where: { id }, data: { status: to } });
    await tx.auditLog.create({
      data: {
        actor: actor?.id ?? "system",
        action: `supplier-lock.${to.toLowerCase()}`,
        resource: "supplier-lock",
        resourceId: id,
      },
    });
    if (reason) {
      await tx.auditLog.create({
        data: {
          actor: actor?.id ?? "system",
          action: "supplier-lock.note",
          resource: "supplier-lock",
          resourceId: `${id}:${reason.slice(0, 200)}`,
        },
      });
    }
    return updated;
  });
}

export async function listSupplierLocks(
  actor: Actor | null,
  options: { supplierId?: string; status?: SupplierLockStatus; bookingRef?: string } = {},
) {
  gateOps(actor);
  return prisma.supplierLock.findMany({
    where: {
      ...(options.supplierId ? { supplierId: options.supplierId } : {}),
      ...(options.status ? { status: options.status } : {}),
      ...(options.bookingRef ? { bookingRef: options.bookingRef } : {}),
    },
    orderBy: { startsAt: "asc" },
    take: 200,
    include: { supplier: { select: { name: true } }, rate: true },
  });
}

export interface SupplierCalendarDay {
  date: string;
  locks: { id: string; serviceName: string; status: SupplierLockStatus; quantity: number; bookingRef: string | null }[];
}

/** Supplier calendar: every committed day in view, for conflict scanning. */
export async function supplierCalendar(actor: Actor | null, supplierId: string, from: Date, to: Date) {
  gateOps(actor);
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new NotFoundError("Supplier");
  const locks = await prisma.supplierLock.findMany({
    where: { supplierId, startsAt: { lt: to }, endsAt: { gt: from }, status: { in: OCCUPYING } },
    orderBy: { startsAt: "asc" },
    select: { id: true, serviceName: true, status: true, quantity: true, bookingRef: true, startsAt: true, endsAt: true },
  });
  return locks.map((lock) => ({
    id: lock.id,
    serviceName: lock.serviceName,
    status: lock.status,
    quantity: lock.quantity,
    bookingRef: lock.bookingRef,
    startsAt: lock.startsAt.toISOString(),
    endsAt: lock.endsAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Master calendar (Phase 7): bookings by travel date + supplier commitments
// with capacity-conflict warnings. Every event links back to its booking.
// ---------------------------------------------------------------------------

export interface CalendarBookingEvent {
  id: string;
  reference: string;
  customerName: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  supplierNames: string[];
}

export interface CalendarCommitment {
  lockId: string;
  supplierId: string;
  supplierName: string;
  serviceName: string;
  serviceType: string;
  status: SupplierLockStatus;
  quantity: number;
  capacity: number | null;
  startsAt: string;
  endsAt: string;
  bookingRef: string | null;
  bookingId: string | null;
  location: string | null;
}

export interface CapacityConflict {
  supplierId: string;
  supplierName: string;
  serviceName: string;
  overBy: number;
  startsAt: string;
  endsAt: string;
  bookingRefs: string[];
}

export const calendarFilterInput = z.object({
  supplierId: z.string().cuid().optional(),
  serviceType: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  status: z.string().trim().max(30).optional(),
  lockStatus: z.string().trim().max(30).optional(),
});

export async function marketplaceCalendar(
  actor: Actor | null,
  from: Date,
  to: Date,
  filters: unknown = {},
): Promise<{ bookings: CalendarBookingEvent[]; commitments: CalendarCommitment[]; conflicts: CapacityConflict[] }> {
  gateOps(actor);
  const filter = calendarFilterInput.parse(filters);
  if (!(from < to)) throw new SupplierError("Calendar window must end after it starts");
  const BOOKING_STATUSES = ["NEW", "IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "CLIENT_REVISION", "AWAITING_PAYMENT", "PARTIALLY_PAID", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED", "REFUND_PENDING", "REFUNDED"];
  const LOCK_STATUSES = ["REQUESTED", "HELD", "CONFIRMED", "DECLINED", "RELEASED", "COMPLETED"];
  if (filter.status && !BOOKING_STATUSES.includes(filter.status)) {
    throw new SupplierError(`Unknown booking status: ${filter.status}`);
  }
  if (filter.lockStatus && !LOCK_STATUSES.includes(filter.lockStatus)) {
    throw new SupplierError(`Unknown lock status: ${filter.lockStatus}`);
  }

  const [bookingRows, lockRows, lines] = await Promise.all([
    prisma.booking.findMany({
      where: {
        travelStart: { lt: to },
        OR: [{ travelEnd: { gt: from } }, { travelEnd: null, travelStart: { gte: from, lt: to } }],
        status: { notIn: ["CANCELLED", "EXPIRED"] },
        ...(filter.status ? { status: filter.status as BookingStatus } : {}),
        ...(filter.supplierId ? { serviceLines: { some: { supplierId: filter.supplierId } } } : {}),
      },
      orderBy: { travelStart: "asc" },
      take: 500,
      select: {
        id: true,
        reference: true,
        customerName: true,
        status: true,
        travelStart: true,
        travelEnd: true,
        serviceLines: { select: { supplier: { select: { name: true } } } },
      },
    }),
    prisma.supplierLock.findMany({
      where: {
        startsAt: { lt: to },
        endsAt: { gt: from },
        ...(filter.supplierId ? { supplierId: filter.supplierId } : {}),
        ...(filter.serviceType ? { serviceType: filter.serviceType } : {}),
        ...(filter.lockStatus ? { status: filter.lockStatus as SupplierLockStatus } : {}),
      },
      orderBy: { startsAt: "asc" },
      take: 500,
      include: { supplier: { select: { id: true, name: true } }, rate: true },
    }),
    prisma.serviceLine.findMany({
      where: { lockId: { not: null } },
      select: { lockId: true, location: true },
    }),
  ]);

  const bookingIdsByRef = new Map<string, string>();
  for (const row of bookingRows) bookingIdsByRef.set(row.reference, row.id);
  const refsNeeded = [...new Set(lockRows.map((l) => l.bookingRef).filter((r): r is string => !!r && !bookingIdsByRef.has(r)))];
  if (refsNeeded.length > 0) {
    const extra = await prisma.booking.findMany({
      where: { reference: { in: refsNeeded } },
      select: { id: true, reference: true },
    });
    for (const row of extra) bookingIdsByRef.set(row.reference, row.id);
  }
  const locationByLock = new Map(lines.map((l) => [l.lockId as string, l.location]));

  let bookings: CalendarBookingEvent[] = bookingRows.map((b) => ({
    id: b.id,
    reference: b.reference,
    customerName: b.customerName,
    status: b.status,
    startsAt: (b.travelStart as Date | null)?.toISOString() ?? "",
    endsAt: b.travelEnd?.toISOString() ?? null,
    supplierNames: [...new Set(b.serviceLines.map((l) => l.supplier?.name).filter((n): n is string => !!n))],
  }));
  if (filter.location) {
    const refsInArea = new Set(
      (await prisma.serviceLine.findMany({
        where: { location: { contains: filter.location, mode: "insensitive" } },
        select: { bookingId: true },
      })).map((l) => l.bookingId),
    );
    bookings = bookings.filter((b) => refsInArea.has(b.id));
  }

  const commitments: CalendarCommitment[] = lockRows.map((lock) => ({
    lockId: lock.id,
    supplierId: lock.supplier.id,
    supplierName: lock.supplier.name,
    serviceName: lock.serviceName,
    serviceType: lock.serviceType,
    status: lock.status,
    quantity: lock.quantity,
    capacity: lock.rate?.capacity ?? null,
    startsAt: lock.startsAt.toISOString(),
    endsAt: lock.endsAt.toISOString(),
    bookingRef: lock.bookingRef,
    bookingId: lock.bookingRef ? (bookingIdsByRef.get(lock.bookingRef) ?? null) : null,
    location: locationByLock.get(lock.id) ?? null,
  }));

  // Capacity conflicts: sweep occupying locks per supplier+service.
  const conflicts: CapacityConflict[] = [];
  const groups = new Map<string, typeof lockRows>();
  for (const lock of lockRows) {
    if (!OCCUPYING.includes(lock.status) || lock.rate?.capacity == null) continue;
    const key = `${lock.supplierId}:${lock.rate.serviceSlug}`;
    const list = groups.get(key) ?? [];
    list.push(lock);
    groups.set(key, list);
  }
  for (const [, group] of groups) {
    const points = [...new Set(group.flatMap((l) => [l.startsAt.getTime(), l.endsAt.getTime()]))].sort((a, b) => a - b);
    const capacity = group[0]?.rate?.capacity ?? 0;
    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i] as number;
      const end = points[i + 1] as number;
      const active = group.filter((l) => l.startsAt.getTime() < end && l.endsAt.getTime() > start);
      const used = active.reduce((sum, l) => sum + l.quantity, 0);
      if (used > capacity) {
        conflicts.push({
          supplierId: group[0]?.supplierId as string,
          supplierName: group[0]?.supplier.name as string,
          serviceName: group[0]?.serviceName as string,
          overBy: used - capacity,
          startsAt: new Date(start).toISOString(),
          endsAt: new Date(end).toISOString(),
          bookingRefs: [...new Set(active.map((l) => l.bookingRef).filter((r): r is string => !!r))],
        });
      }
    }
  }

  return { bookings, commitments, conflicts };
}

// ---------------------------------------------------------------------------
// Matching: suggest active suppliers for a needed service
// ---------------------------------------------------------------------------

export const suggestInput = z.object({
  serviceType: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(80),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  quantity: z.number().int().min(1).max(1000).default(1),
  minRating: z.number().int().min(1).max(5).optional(),
});

export interface SupplierSuggestion {
  supplierId: string;
  supplierName: string;
  rating: number | null;
  rateId: string;
  serviceName: string;
  serviceSlug: string;
  unit: string;
  currency: string;
  costCents: number;
  capacity: number | null;
  freeUnits: number | null;
  version: number;
}

export async function suggestSuppliers(actor: Actor | null, input: unknown): Promise<SupplierSuggestion[]> {
  gateOps(actor);
  const data = suggestInput.parse(input);
  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (!(startsAt < endsAt)) throw new SupplierError("Service must end after it starts");

  const suppliers = await prisma.supplier.findMany({
    where: {
      status: "ACTIVE",
      types: { some: { slug: data.serviceType } },
      coverageAreas: { has: data.location },
      ...(data.minRating ? { rating: { gte: data.minRating } } : {}),
    },
    include: {
      rates: { where: { serviceType: data.serviceType, validTo: null }, orderBy: { costCents: "asc" } },
    },
  });

  const suggestions: SupplierSuggestion[] = [];
  for (const supplier of suppliers) {
    for (const rate of supplier.rates) {
      let freeUnits: number | null = null;
      if (rate.capacity !== null) {
        const used = await occupyingUsage(prisma, supplier.id, rate.serviceSlug, startsAt, endsAt);
        freeUnits = rate.capacity - used;
        if (freeUnits < data.quantity) continue;
      }
      suggestions.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        rating: supplier.rating,
        rateId: rate.id,
        serviceName: rate.serviceName,
        serviceSlug: rate.serviceSlug,
        unit: rate.unit,
        currency: rate.currency,
        costCents: rate.costCents,
        capacity: rate.capacity,
        freeUnits,
        version: rate.version,
      });
    }
  }
  // Cheapest first; best-rated breaks ties.
  suggestions.sort((a, b) => a.costCents - b.costCents || (b.rating ?? 0) - (a.rating ?? 0));
  return suggestions;
}

// ---------------------------------------------------------------------------
// Single-purpose supplier tokens (availability accept/decline links)
// ---------------------------------------------------------------------------

export async function mintSupplierResponseToken(
  actor: Actor | null,
  lockId: string,
  purpose: "availability-response" | "confirmation" = "availability-response",
  ttlHours = 72,
): Promise<{ token: string; expiresAt: Date }> {
  gateOps(actor);
  const lock = await prisma.supplierLock.findUnique({ where: { id: lockId } });
  if (!lock) throw new NotFoundError("Supplier lock");
  const token = mintSupplierToken();
  const expiresAt = new Date(Date.now() + ttlHours * 3600_000);
  await prisma.supplierToken.create({
    data: {
      tokenHash: hashSupplierToken(token),
      supplierId: lock.supplierId,
      lockId: lock.id,
      purpose,
      expiresAt,
      createdById: actor?.id ?? null,
    },
  });
  return { token, expiresAt };
}

export async function verifySupplierToken(token: string, now: Date = new Date()) {
  const record = await prisma.supplierToken.findUnique({
    where: { tokenHash: hashSupplierToken(token) },
    include: { lock: { include: { supplier: { select: { name: true } }, rate: true } } },
  });
  if (!record || !tokensEqual(record.tokenHash, hashSupplierToken(token))) {
    throw new NotFoundError("Token");
  }
  if (record.usedAt) throw new SupplierError("This link has already been used");
  if (record.expiresAt < now) throw new SupplierError("This link has expired");
  return record;
}

export async function consumeSupplierToken(token: string, now: Date = new Date()) {
  const record = await verifySupplierToken(token, now);
  return prisma.supplierToken.update({ where: { id: record.id }, data: { usedAt: now } });
}

// ---------------------------------------------------------------------------
// Supplier payouts (due → paid; realised in Phase 6+ reporting in Phase 8)
// ---------------------------------------------------------------------------

export const payoutInput = z.object({
  supplierId: z.string().cuid(),
  bookingRef: z.string().trim().max(40).optional(),
  lockId: z.string().cuid().optional(),
  amountCents: z.number().int().min(0).max(100_000_000),
  currency: z.enum(["KES", "USD"]).default("USD"),
  dueDate: z.string().datetime().optional(),
  reference: z.string().trim().max(120).optional(),
});

export async function recordSupplierPayout(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = payoutInput.parse(input);
  const supplier = await prisma.supplier.findUnique({ where: { id: data.supplierId } });
  if (!supplier) throw new NotFoundError("Supplier");
  const payout = await prisma.supplierPayout.create({
    data: {
      supplierId: data.supplierId,
      bookingRef: data.bookingRef ?? null,
      lockId: data.lockId ?? null,
      amountCents: data.amountCents,
      currency: data.currency,
      status: "DUE",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      reference: data.reference ?? null,
    },
  });
  await recordAudit(actor?.id ?? null, "supplier-payout.recorded", "supplier", data.supplierId);
  return payout;
}

export async function setSupplierPayoutStatus(
  actor: Actor | null,
  id: string,
  status: "DUE" | "PAID" | "CANCELLED",
) {
  gateFinance(actor);
  const payout = await prisma.supplierPayout.findUnique({ where: { id } });
  if (!payout) throw new NotFoundError("Payout");
  if (payout.status !== "DUE" && status === "DUE") {
    throw new SupplierError(`Cannot reopen a ${payout.status.toLowerCase()} payout to due`);
  }
  const updated = await prisma.supplierPayout.update({
    where: { id },
    data: { status, ...(status === "PAID" ? { paidAt: new Date() } : {}) },
  });
  await recordAudit(actor?.id ?? null, `supplier-payout.${status.toLowerCase()}`, "supplier", payout.supplierId);
  return updated;
}

export async function listSupplierPayouts(
  actor: Actor | null,
  options: { supplierId?: string; status?: "DUE" | "PAID" | "CANCELLED" } = {},
) {
  gateFinance(actor);
  return prisma.supplierPayout.findMany({
    where: {
      ...(options.supplierId ? { supplierId: options.supplierId } : {}),
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { supplier: { select: { name: true } } },
  });
}
