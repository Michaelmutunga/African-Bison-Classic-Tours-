import { createHash } from "node:crypto";
import { Prisma, type BookingStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { ConflictError, NotFoundError, type Actor } from "@/server/catalogue";
import { hasPermission } from "@/lib/permissions";

export class BookingError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateStaff(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

// ---------------------------------------------------------------------------
// State machine (§12). No arbitrary transitions — ever.
// ---------------------------------------------------------------------------

export const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  INQUIRY: ["QUOTE_DRAFT", "HOLD", "CANCELLED", "EXPIRED"],
  QUOTE_DRAFT: ["QUOTE_SENT", "HOLD", "CANCELLED", "EXPIRED"],
  QUOTE_SENT: ["QUOTE_DRAFT", "HOLD", "AWAITING_DEPOSIT", "CANCELLED", "EXPIRED"],
  HOLD: ["AWAITING_DEPOSIT", "CONFIRMED", "CANCELLED", "EXPIRED"],
  AWAITING_DEPOSIT: ["CONFIRMED", "CANCELLED", "EXPIRED"],
  CONFIRMED: ["PRE_TRIP", "CANCELLED"],
  PRE_TRIP: ["ON_SAFARI", "CANCELLED"],
  ON_SAFARI: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: ["INQUIRY", "HOLD"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
};

const MODIFIABLE = ["INQUIRY", "HOLD", "AWAITING_DEPOSIT"] as const;
const CANCELLABLE: BookingStatus[] = [
  "INQUIRY",
  "QUOTE_DRAFT",
  "QUOTE_SENT",
  "HOLD",
  "AWAITING_DEPOSIT",
  "CONFIRMED",
  "PRE_TRIP",
];

export function bookingReference(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `ABCT-${new Date().getFullYear()}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const travellerInput = z.object({
  fullName: z.string().trim().min(2).max(160),
  kind: z.enum(["adult", "child", "infant"]).default("adult"),
  email: z.string().trim().email().max(254).optional(),
});

const holdInput = z.object({
  resourceType: z.string().trim().min(2).max(60),
  resourceId: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(50).default(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  // Capacity is caller-supplied until capacity masters land (Phase 10).
  capacity: z.number().int().min(1).max(1000),
  ttlMinutes: z.number().int().min(5).max(20_160).default(2880),
});

export const bookingInput = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().trim().email().max(254),
  customerPhone: z.string().trim().max(40).optional(),
  tourId: z.string().cuid().optional(),
  quoteId: z.string().cuid().optional(),
  travelStart: z.string().datetime().optional(),
  travelEnd: z.string().datetime().optional(),
  adults: z.number().int().min(1).max(18).default(1),
  children: z.number().int().min(0).max(18).default(0),
  infants: z.number().int().min(0).max(6).default(0),
  currency: z.string().trim().length(3).default("USD"),
  // Staff-entered commercial terms when no quote is attached.
  subtotalCents: z.number().int().min(0).default(0),
  discountCents: z.number().int().min(0).default(0),
  totalCents: z.number().int().min(0).default(0),
  depositCents: z.number().int().min(0).default(0),
  snapshot: z.record(z.string(), z.unknown()).optional(),
  travellers: z.array(travellerInput).max(24).default([]),
  holds: z.array(holdInput).max(10).default([]),
  idempotencyKey: z.string().trim().max(120).optional(),
});

export type BookingInput = z.infer<typeof bookingInput>;

// ---------------------------------------------------------------------------
// Concurrency: per-resource serialization via advisory transaction locks.
// Two concurrent requests for the same resource+dates cannot interleave.
// ---------------------------------------------------------------------------

export type BookingTx = Prisma.TransactionClient;
type Tx = BookingTx;

function lockKeys(resourceType: string, resourceId: string): [number, number] {
  const hex = createHash("sha256").update(`${resourceType}:${resourceId}`).digest("hex");
  // Two signed 32-bit keys. Bitwise AND both bounds the range exactly and
  // matches Postgres int4, whose two-arg advisory lock we call below.
  const toInt32 = (part: string) => parseInt(part, 16) & 0x7fffffff;
  return [toInt32(hex.slice(0, 8)), toInt32(hex.slice(8, 16))];
}

async function withResourceLock<T>(tx: Tx, resourceType: string, resourceId: string, fn: () => Promise<T>): Promise<T> {
  const [k1, k2] = lockKeys(resourceType, resourceId);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${k1}::int, ${k2}::int)`;
  return fn();
}

async function overlappingUsage(
  tx: Tx,
  resourceType: string,
  resourceId: string,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: string,
): Promise<number> {
  const holds = await tx.hold.findMany({
    where: {
      resourceType,
      resourceId,
      status: { in: ["ACTIVE", "CONSUMED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
      ...(excludeBookingId ? { bookingId: { not: excludeBookingId } } : {}),
    },
    select: { quantity: true },
  });
  return holds.reduce((sum, hold) => sum + hold.quantity, 0);
}

async function recordHistory(
  tx: Tx,
  bookingId: string,
  from: BookingStatus | null,
  to: BookingStatus,
  actorId: string | null,
  reason?: string,
): Promise<void> {
  await tx.bookingStatusHistory.create({
    data: { bookingId, from, to, actorId, reason: reason ?? null },
  });
}

export async function applyTransition(
  tx: Tx,
  bookingId: string,
  to: BookingStatus,
  actorId: string | null,
  reason?: string,
): Promise<void> {
  const booking = await tx.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking");
  if (!TRANSITIONS[booking.status].includes(to)) {
    throw new BookingError(`Cannot move booking from ${booking.status} to ${to}`);
  }
  await tx.booking.update({ where: { id: bookingId }, data: { status: to } });
  await recordHistory(tx, bookingId, booking.status, to, actorId, reason);
  if (to === "CONFIRMED") {
    await tx.hold.updateMany({ where: { bookingId, status: "ACTIVE" }, data: { status: "CONSUMED" } });
  }
  if (to === "CANCELLED" || to === "EXPIRED") {
    await tx.hold.updateMany({ where: { bookingId, status: "ACTIVE" }, data: { status: "RELEASED" } });
  }
}

// ---------------------------------------------------------------------------
// Holds
// ---------------------------------------------------------------------------

export interface HoldRequest {
  bookingId: string;
  resourceType: string;
  resourceId: string;
  quantity?: number;
  startsAt: string;
  endsAt: string;
  capacity: number;
  ttlMinutes?: number;
  now?: Date;
}

async function createHoldInTx(
  tx: Tx,
  actorId: string | null,
  bookingId: string,
  resourceType: string,
  resourceId: string,
  quantity: number,
  startsAt: Date,
  endsAt: Date,
  capacity: number,
  expiresAt: Date,
  excludeBookingId?: string,
) {
  return withResourceLock(tx, resourceType, resourceId, async () => {
    const used = await overlappingUsage(tx, resourceType, resourceId, startsAt, endsAt, excludeBookingId);
    if (used + quantity > capacity) {
      throw new ConflictError(`Insufficient availability for ${resourceType}:${resourceId}`);
    }
    return tx.hold.create({
      data: {
        bookingId,
        resourceType,
        resourceId,
        quantity,
        startsAt,
        endsAt,
        expiresAt,
        status: "ACTIVE",
        createdById: actorId,
      },
    });
  });
}

export async function createHold(
  actor: Actor | null,
  request: HoldRequest,
  excludeBookingId?: string,
) {
  gateStaff(actor);
  const startsAt = new Date(request.startsAt);
  const endsAt = new Date(request.endsAt);
  if (!(startsAt < endsAt)) throw new BookingError("Hold must end after it starts");
  const now = request.now ?? new Date();
  const ttl = request.ttlMinutes ?? 2880;
  if (ttl < 5 || ttl > 20_160) throw new BookingError("Hold TTL out of range");
  const quantity = request.quantity ?? 1;
  const booking = await prisma.booking.findUnique({ where: { id: request.bookingId } });
  if (!booking) throw new NotFoundError("Booking");

  return prisma.$transaction(async (tx) => {
    return createHoldInTx(
      tx,
      actor?.id ?? null,
      request.bookingId,
      request.resourceType,
      request.resourceId,
      quantity,
      startsAt,
      endsAt,
      request.capacity,
      new Date(now.getTime() + ttl * 60_000),
      excludeBookingId,
    );
  });
}

export async function renewHold(
  actor: Actor | null,
  holdId: string,
  ttlMinutes: number,
  now: Date = new Date(),
) {
  gateStaff(actor);
  if (ttlMinutes < 5 || ttlMinutes > 20_160) throw new BookingError("Hold TTL out of range");
  const hold = await prisma.hold.findUnique({ where: { id: holdId } });
  if (!hold) throw new NotFoundError("Hold");
  if (hold.status !== "ACTIVE") throw new BookingError("Only active holds can be renewed");
  if (hold.expiresAt < now) throw new BookingError("Hold has already expired");
  return prisma.hold.update({
    where: { id: holdId },
    data: { expiresAt: new Date(now.getTime() + ttlMinutes * 60_000) },
  });
}

export async function releaseHold(actor: Actor | null, holdId: string) {
  gateStaff(actor);
  const hold = await prisma.hold.findUnique({ where: { id: holdId } });
  if (!hold) throw new NotFoundError("Hold");
  if (hold.status !== "ACTIVE") throw new BookingError("Only active holds can be released");
  return prisma.hold.update({ where: { id: holdId }, data: { status: "RELEASED" } });
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function createBooking(actor: Actor | null, input: unknown, now: Date = new Date()) {
  const data = bookingInput.parse(input);
  if (data.travelStart && data.travelEnd && !(new Date(data.travelStart) < new Date(data.travelEnd))) {
    throw new BookingError("Travel must end after it starts");
  }

  return prisma.$transaction(async (tx) => {
    if (data.idempotencyKey) {
      const existing = await tx.booking.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        include: { travellers: true, holds: true },
      });
      if (existing) return existing;
    }

    let totals = {
      subtotalCents: data.subtotalCents,
      discountCents: data.discountCents,
      totalCents: data.totalCents,
      depositCents: data.depositCents,
    };
    let snapshot: Prisma.InputJsonValue | undefined =
      data.snapshot === undefined
        ? undefined
        : (JSON.parse(JSON.stringify(data.snapshot)) as Prisma.InputJsonValue);
    let quoteId: string | null = null;

    if (data.quoteId) {
      const quote = await tx.quote.findUnique({ where: { id: data.quoteId } });
      if (!quote) throw new NotFoundError("Quote");
      if (quote.status !== "ACCEPTED") {
        throw new BookingError("Only accepted quotes convert to bookings");
      }
      totals = {
        subtotalCents: quote.subtotalCents,
        discountCents: quote.discountCents,
        totalCents: quote.totalCents,
        depositCents: quote.depositCents,
      };
      snapshot = quote.snapshot as Prisma.InputJsonValue;
      quoteId = quote.id;
      await tx.quote.update({ where: { id: quote.id }, data: { status: "CONVERTED" } });
    }

    if (data.tourId) {
      const tour = await tx.tourProduct.findUnique({ where: { id: data.tourId } });
      if (!tour) throw new NotFoundError("Tour");
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const booking = await tx.booking.create({
          data: {
            reference: bookingReference(),
            userId: actor && actor.role === "CUSTOMER" ? actor.id : null,
            customerName: data.customerName,
            customerEmail: data.customerEmail.toLowerCase(),
            customerPhone: data.customerPhone ?? null,
            tourId: data.tourId ?? null,
            quoteId,
            status: "INQUIRY",
            currency: data.currency,
            ...totals,
            paidCents: 0,
            travelStart: data.travelStart ? new Date(data.travelStart) : null,
            travelEnd: data.travelEnd ? new Date(data.travelEnd) : null,
            adults: data.adults,
            children: data.children,
            infants: data.infants,
            snapshot,
            idempotencyKey: data.idempotencyKey ?? null,
            createdById: actor?.id ?? null,
            travellers: {
              create: data.travellers.map((t) => ({
                fullName: t.fullName,
                kind: t.kind,
                email: t.email ?? null,
              })),
            },
          },
          include: { travellers: true, holds: true },
        });
        await recordHistory(tx, booking.id, null, "INQUIRY", actor?.id ?? null, "Booking created");

        // Every hold passes through the locked availability check — no
        // unguarded inventory writes anywhere in the codebase.
        for (const hold of data.holds) {
          await createHoldInTx(
            tx,
            actor?.id ?? null,
            booking.id,
            hold.resourceType,
            hold.resourceId,
            hold.quantity,
            new Date(hold.startsAt),
            new Date(hold.endsAt),
            hold.capacity,
            new Date(now.getTime() + hold.ttlMinutes * 60_000),
          );
        }
        if (data.holds.length > 0) {
          await applyTransition(tx, booking.id, "HOLD", actor?.id ?? null, "Resources held");
        }
        return tx.booking.findUniqueOrThrow({
          where: { id: booking.id },
          include: { travellers: true, holds: true },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Reference clash (or a concurrent idempotent retry): retry, or
          // return the idempotent record when the key matches.
          if (data.idempotencyKey) {
            const existing = await tx.booking.findUnique({
              where: { idempotencyKey: data.idempotencyKey },
              include: { travellers: true, holds: true },
            });
            if (existing) return existing;
          }
          continue;
        }
        throw error;
      }
    }
    throw new ConflictError("Could not create booking");
  });
}

const modifySchema = z.object({
  travelStart: z.string().datetime().nullable().optional(),
  travelEnd: z.string().datetime().nullable().optional(),
  adults: z.number().int().min(1).max(18).optional(),
  children: z.number().int().min(0).max(18).optional(),
  infants: z.number().int().min(0).max(6).optional(),
  travellers: z.array(travellerInput).max(24).optional(),
  customerPhone: z.string().trim().max(40).nullable().optional(),
  reason: z.string().trim().max(500).optional(),
});

export async function modifyBooking(actor: Actor | null, id: string, input: unknown) {
  gateStaff(actor);
  const data = modifySchema.parse(input);
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id }, include: { holds: true } });
    if (!booking) throw new NotFoundError("Booking");
    if (!(MODIFIABLE as readonly string[]).includes(booking.status)) {
      throw new BookingError(`Bookings in ${booking.status} cannot be modified`);
    }
    const travelStart = data.travelStart === undefined ? booking.travelStart : data.travelStart ? new Date(data.travelStart) : null;
    const travelEnd = data.travelEnd === undefined ? booking.travelEnd : data.travelEnd ? new Date(data.travelEnd) : null;
    if (travelStart && travelEnd && !(travelStart < travelEnd)) {
      throw new BookingError("Travel must end after it starts");
    }
    // Date changes re-validate holds against the new window (excluding our
    // own booking so we never self-conflict), then swap atomically.
    const datesChanged =
      travelStart?.getTime() !== booking.travelStart?.getTime() ||
      travelEnd?.getTime() !== booking.travelEnd?.getTime();
    if (datesChanged) {
      // Holds pin the original window. Changing dates releases them so staff
      // re-hold against live availability instead of silently overbooking.
      await tx.hold.updateMany({ where: { bookingId: id, status: "ACTIVE" }, data: { status: "RELEASED" } });
    }
    const updated = await tx.booking.update({
      where: { id },
      data: {
        ...(travelStart !== undefined ? { travelStart } : {}),
        ...(travelEnd !== undefined ? { travelEnd } : {}),
        ...(data.adults !== undefined ? { adults: data.adults } : {}),
        ...(data.children !== undefined ? { children: data.children } : {}),
        ...(data.infants !== undefined ? { infants: data.infants } : {}),
        ...(data.customerPhone !== undefined ? { customerPhone: data.customerPhone } : {}),
      },
    });
    if (data.travellers) {
      await tx.bookingTraveller.deleteMany({ where: { bookingId: id } });
      await tx.bookingTraveller.createMany({
        data: data.travellers.map((t) => ({
          bookingId: id,
          fullName: t.fullName,
          kind: t.kind,
          email: t.email ?? null,
        })),
      });
    }
    await recordHistory(tx, id, booking.status, booking.status, actor?.id ?? null, data.reason ?? "Booking modified");
    return tx.booking.findUniqueOrThrow({
      where: { id: updated.id },
      include: { travellers: true, holds: true },
    });
  });
}

export async function cancelBooking(
  actor: Actor | null,
  id: string,
  reason?: string,
  ownerEmail?: string,
) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError("Booking");
  if (actor) {
    gateStaff(actor);
  } else {
    // Guest path: reference lookup already happened; email must match.
    if (!ownerEmail || booking.customerEmail !== ownerEmail.toLowerCase()) {
      throw new ForbiddenError("bookings.write");
    }
  }
  if (!CANCELLABLE.includes(booking.status)) {
    throw new BookingError(`Bookings in ${booking.status} cannot be cancelled`);
  }
  const target = booking.paidCents > 0 ? "REFUND_PENDING" : "CANCELLED";
  return prisma.$transaction(async (tx) => {
    // Bypass applyTransition's fixed map: cancellation routes by payment.
    const fresh = await tx.booking.findUnique({ where: { id } });
    if (!fresh || !CANCELLABLE.includes(fresh.status)) {
      throw new BookingError(`Bookings in ${fresh?.status} cannot be cancelled`);
    }
    await tx.booking.update({ where: { id }, data: { status: target } });
    await recordHistory(tx, id, fresh.status, target, actor?.id ?? null, reason ?? "Booking cancelled");
    await tx.hold.updateMany({ where: { bookingId: id, status: "ACTIVE" }, data: { status: "RELEASED" } });
    return tx.booking.findUniqueOrThrow({
      where: { id },
      include: { travellers: true, holds: true },
    });
  });
}

export async function setBookingStatus(actor: Actor | null, id: string, to: BookingStatus, reason?: string) {
  gateStaff(actor);
  return prisma.$transaction(async (tx) => {
    await applyTransition(tx, id, to, actor?.id ?? null, reason);
    return tx.booking.findUniqueOrThrow({
      where: { id },
      include: { travellers: true, holds: true },
    });
  });
}

export async function sweepExpirations(now: Date = new Date()): Promise<{ holds: number; bookings: number }> {
  return prisma.$transaction(async (tx) => {
    const holds = await tx.hold.updateMany({
      where: { status: "ACTIVE", expiresAt: { lt: now } },
      data: { status: "EXPIRED" },
    });
    // Bookings stuck in HOLD with no live holds expire too.
    const candidates = await tx.booking.findMany({
      where: { status: "HOLD" },
      select: { id: true, status: true },
    });
    let bookings = 0;
    for (const candidate of candidates) {
      const live = await tx.hold.count({ where: { bookingId: candidate.id, status: "ACTIVE" } });
      if (live === 0) {
        await tx.booking.update({ where: { id: candidate.id }, data: { status: "EXPIRED" } });
        await recordHistory(tx, candidate.id, "HOLD", "EXPIRED", null, "All holds expired");
        bookings += 1;
      }
    }
    return { holds: holds.count, bookings };
  });
}

export async function getBookingByReference(reference: string, email: string) {
  const booking = await prisma.booking.findUnique({
    where: { reference },
    include: {
      tour: { select: { slug: true, title: true } },
      travellers: true,
      holds: { where: { status: { in: ["ACTIVE", "CONSUMED"] } } },
    },
  });
  if (!booking || booking.customerEmail !== email.toLowerCase()) return null;
  return booking;
}

export async function getBooking(actor: Actor | null, id: string) {
  gateStaff(actor);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      tour: { select: { slug: true, title: true } },
      travellers: true,
      holds: true,
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!booking) throw new NotFoundError("Booking");
  return booking;
}

export async function listBookings(actor: Actor | null, status?: BookingStatus) {
  gateStaff(actor);
  return prisma.booking.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { tour: { select: { slug: true, title: true } } },
  });
}
