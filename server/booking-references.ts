import { formatInTimeZone } from "date-fns-tz";
import type { Prisma } from "@prisma/client";

/**
 * Marketplace booking references (Phase 1).
 *
 * Format: ABCT-YYYY-MM-DD-NNN (e.g. ABCT-2026-10-01-001).
 * - The date is the booking CREATION date in Africa/Nairobi. Travel dates
 *   are separate fields and never feed the reference.
 * - NNN is a zero-padded per-day counter starting at 001. Past 999 it grows
 *   to 4+ digits (no wraparound, no collision).
 * - Issue is atomic: per-day counter row + advisory transaction lock, so two
 *   simultaneous submissions can never share a number.
 *
 * Legacy refs (ABCT-YYYY-XXXXXX, random suffix) remain valid and searchable;
 * only newly issued bookings use the dated format.
 */

export const BOOKING_REFERENCE_PREFIX = "ABCT";
export const BOOKING_REFERENCE_TIMEZONE = "Africa/Nairobi";

const DATED_REF = /^ABCT-(\d{4})-(\d{2})-(\d{2})-(\d{3,})$/;

export interface ParsedBookingReference {
  dateKey: string;
  sequence: number;
}

/** Nairobi calendar date (YYYY-MM-DD) for a creation instant. */
export function nairobiDateKey(now: Date): string {
  return formatInTimeZone(now, BOOKING_REFERENCE_TIMEZONE, "yyyy-MM-dd");
}

/** Format a dated reference. Padding grows past 999 (1000 -> "1000"). */
export function formatBookingReference(dateKey: string, sequence: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`Invalid date key for booking reference: ${dateKey}`);
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid sequence for booking reference: ${sequence}`);
  }
  return `${BOOKING_REFERENCE_PREFIX}-${dateKey}-${String(sequence).padStart(3, "0")}`;
}

/** Parse a dated reference; returns null for legacy/random refs. */
export function parseBookingReference(reference: string): ParsedBookingReference | null {
  const match = DATED_REF.exec(reference.trim().toUpperCase());
  if (!match) return null;
  return { dateKey: `${match[1]}-${match[2]}-${match[3]}`, sequence: Number(match[4]) };
}

/** True for dated refs issued by this module. */
export function isDatedBookingReference(reference: string): boolean {
  return DATED_REF.test(reference.trim().toUpperCase());
}

// ---------------------------------------------------------------------------
// Derived traceability refs. Pure functions; versioning flows that mint them
// (quote versions, service lines, payment sequences) land in later phases.
// ---------------------------------------------------------------------------

/** Quote version ref, e.g. ABCT-2026-10-01-001-Q2. */
export function quoteVersionReference(bookingReference: string, version: number): string {
  if (!Number.isInteger(version) || version < 1) throw new Error(`Invalid quote version: ${version}`);
  return `${bookingReference.trim().toUpperCase()}-Q${version}`;
}

/** Service-line ref, e.g. ABCT-2026-10-01-001-S1. */
export function serviceLineReference(bookingReference: string, line: number): string {
  if (!Number.isInteger(line) || line < 1) throw new Error(`Invalid service line number: ${line}`);
  return `${bookingReference.trim().toUpperCase()}-S${line}`;
}

/** Payment ref, e.g. ABCT-2026-10-01-001-P1. */
export function paymentReference(bookingReference: string, sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error(`Invalid payment sequence: ${sequence}`);
  }
  return `${bookingReference.trim().toUpperCase()}-P${sequence}`;
}

// ---------------------------------------------------------------------------
// Atomic issuance. Must run inside the booking's database transaction.
// ---------------------------------------------------------------------------

type Tx = Prisma.TransactionClient;

export async function issueBookingReference(tx: Tx, now: Date = new Date()): Promise<string> {
  const dateKey = nairobiDateKey(now);
  // Serialise concurrent issuers for this day. hashtextextended -> bigint
  // matches the single-arg pg_advisory_xact_lock(bigint) exactly.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"booking-ref:" + dateKey}, 0))`;
  const counter = await tx.bookingDailyCounter.upsert({
    where: { date: dateKey },
    update: { count: { increment: 1 } },
    create: { date: dateKey, count: 1 },
  });
  return formatBookingReference(dateKey, counter.count);
}
