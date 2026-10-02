import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { applyBps, DEPOSIT_BPS, formatMoney } from "@/lib/money";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { NotFoundError, type Actor } from "@/server/catalogue";
import { applyTransition } from "@/server/bookings";
import {
  LOCK_TRANSITIONS,
  createSupplierLock,
  mintSupplierResponseToken,
  suggestSuppliers,
  verifySupplierToken,
} from "@/server/suppliers";
import { addServiceLine, loadPricingConfig } from "@/server/marketplace-pricing";
import { requireBookingAccess } from "@/server/portal";
import type { SafeUser } from "@/lib/auth";
import { notify } from "@/server/notifications/dispatch";
import { SITE_URL } from "@/server/notifications/templates";
import { quoteVersionReference, serviceLineReference } from "@/server/booking-references";

/**
 * Marketplace workflow (Phase 6): NEW → IN_REVIEW → SUPPLIERS_PENDING →
 * QUOTE_DRAFT → QUOTE_APPROVED → QUOTE_SENT → (CLIENT_REVISION ↩) →
 * AWAITING_PAYMENT → PARTIALLY_PAID → CONFIRMED → IN_PROGRESS → COMPLETED.
 * Every transition is server-enforced and history-logged; the client only
 * ever sees client-safe quote snapshots (no suppliers, costs or markup).
 */

export class WorkflowError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateOps(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

async function businessContact(): Promise<{ email: string | null; phone: string | null }> {
  const settings = await prisma.siteSetting.findMany({
    where: { key: { in: ["business.email", "business.phonePrimary"] } },
  });
  const get = (key: string) => settings.find((s) => s.key === key)?.value ?? null;
  return { email: get("business.email"), phone: get("business.phonePrimary") };
}

async function quoteSettings(): Promise<{ validityDays: number; paymentTerms: string; cancellationTerms: string }> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: ["quote.validityDays", "quote.paymentTerms", "quote.cancellationTerms"] } },
  });
  const get = (key: string) => rows.find((r) => r.key === key)?.value ?? null;
  return {
    validityDays: Math.min(90, Math.max(1, Number(get("quote.validityDays") ?? "14") || 14)),
    paymentTerms: get("quote.paymentTerms") ?? "30% deposit on acceptance; balance 30 days before travel.",
    cancellationTerms: get("quote.cancellationTerms") ?? "Cancellation terms are confirmed with your quote.",
  };
}

// ---------------------------------------------------------------------------
// 1. Auto-propose service lines from the request
// ---------------------------------------------------------------------------

export interface ProposedLine {
  lineId: string;
  serviceName: string;
  suggestions: Awaited<ReturnType<typeof suggestSuppliers>>;
}

export async function proposeServiceLines(actor: Actor | null, bookingId: string, now: Date = new Date()) {
  gateOps(actor);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { tour: { include: { destinations: true } }, serviceLines: true },
  });
  if (!booking) throw new NotFoundError("Booking");
  if (!["NEW", "IN_REVIEW"].includes(booking.status)) {
    throw new WorkflowError(`Cannot propose lines while the booking is ${booking.status}`);
  }

  const pax = booking.adults + booking.children;
  const days =
    booking.travelStart && booking.travelEnd
      ? Math.max(1, Math.round((booking.travelEnd.getTime() - booking.travelStart.getTime()) / 86_400_000))
      : 1;
  const window = {
    startsAt: booking.travelStart?.toISOString(),
    endsAt: booking.travelEnd?.toISOString(),
  };
  const baseLocation = booking.airport ?? booking.tour?.destinations[0]?.name ?? "Nairobi";

  const specs: Parameters<typeof addServiceLine>[2][] = [];
  // Airport transfers: arrival + departure.
  specs.push({
    serviceName: "Airport transfers (arrival + departure)",
    serviceType: "airport-transfer",
    unit: "PER_TRANSFER",
    quantity: 2,
    location: baseLocation,
    ...(window.startsAt ? { startsAt: window.startsAt } : {}),
    ...(window.endsAt ? { endsAt: window.endsAt } : {}),
    costCents: 0,
    currency: booking.currency as "USD" | "KES",
  });
  // Stays: one line per destination (tour) or requested place (custom).
  const places =
    booking.source === "CUSTOM"
      ? (((booking.customItinerary as { destinations?: unknown } | null)?.destinations as string[] | undefined) ?? []).filter(
          (d): d is string => typeof d === "string",
        )
      : (booking.tour?.destinations.map((d) => d.name) ?? []);
  for (const place of [...new Set(places)].slice(0, 12)) {
    specs.push({
      serviceName: `Stay in ${place}`,
      serviceType: "hotel-lodge-camp",
      unit: "PER_PERSON_PER_NIGHT",
      quantity: 1,
      pax: Math.max(1, pax),
      location: place,
      ...(window.startsAt ? { startsAt: window.startsAt } : {}),
      ...(window.endsAt ? { endsAt: window.endsAt } : {}),
      costCents: 0,
      currency: booking.currency as "USD" | "KES",
    });
  }
  // Driver-guide for the trip.
  specs.push({
    serviceName: "Driver-guide",
    serviceType: "driver-guide",
    unit: "PER_GROUP",
    quantity: Math.min(days, 30),
    location: places[0] ?? baseLocation,
    ...(window.startsAt ? { startsAt: window.startsAt } : {}),
    ...(window.endsAt ? { endsAt: window.endsAt } : {}),
    costCents: 0,
    currency: booking.currency as "USD" | "KES",
  });

  const created = [];
  for (const spec of specs) {
    created.push(await addServiceLine(actor, bookingId, spec));
  }

  const suggestions: ProposedLine[] = [];
  for (const line of created) {
    let matches: ProposedLine["suggestions"] = [];
    if (line.startsAt && line.endsAt && line.location) {
      try {
        matches = (
          await suggestSuppliers(actor, {
            serviceType: line.serviceType,
            location: line.location,
            startsAt: line.startsAt.toISOString(),
            endsAt: line.endsAt.toISOString(),
            quantity: line.quantity,
          })
        ).slice(0, 3);
      } catch {
        matches = [];
      }
    }
    suggestions.push({ lineId: line.id, serviceName: line.serviceName, suggestions: matches });
  }

  if (booking.status === "NEW") {
    await prisma.$transaction(async (tx) => {
      await applyTransition(tx, bookingId, "IN_REVIEW", actor?.id ?? null, "Service lines proposed");
    });
  }
  void now;
  return { lines: created, suggestions };
}

// ---------------------------------------------------------------------------
// 2. Request availability (supplier locks + tokenized links)
// ---------------------------------------------------------------------------

export const requestAvailabilityInput = z.object({
  items: z
    .array(
      z.object({
        lineId: z.string().cuid(),
        supplierId: z.string().cuid(),
        rateId: z.string().cuid(),
      }),
    )
    .min(1)
    .max(20)
    .optional(),
});

export async function requestSupplierAvailability(actor: Actor | null, bookingId: string, input: unknown) {
  gateOps(actor);
  const data = requestAvailabilityInput.parse(input);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { serviceLines: { orderBy: { seq: "asc" } } },
  });
  if (!booking) throw new NotFoundError("Booking");
  if (!["NEW", "IN_REVIEW", "SUPPLIERS_PENDING"].includes(booking.status)) {
    throw new WorkflowError(`Cannot request suppliers while the booking is ${booking.status}`);
  }

  // Default: lines with a supplier + rate assigned but no lock yet.
  const items =
    data.items ??
    booking.serviceLines
      .filter((line) => line.supplierId && line.rateId && !line.lockId)
      .map((line) => ({ lineId: line.id, supplierId: line.supplierId as string, rateId: line.rateId as string }));
  if (items.length === 0) {
    throw new WorkflowError("Assign a supplier and rate to at least one service line first");
  }

  const results = [];
  for (const item of items) {
    const line = booking.serviceLines.find((l) => l.id === item.lineId);
    if (!line) throw new NotFoundError("Service line");
    const lock = await createSupplierLock(actor, {
      rateId: item.rateId,
      bookingRef: booking.reference,
      serviceRef: serviceLineReference(booking.reference, line.seq),
      startsAt: (line.startsAt ?? booking.travelStart ?? new Date()).toISOString(),
      endsAt: (line.endsAt ?? booking.travelEnd ?? new Date(Date.now() + 86_400_000)).toISOString(),
      quantity: line.quantity,
    });
    await prisma.serviceLine.update({ where: { id: line.id }, data: { lockId: lock.id, supplierId: item.supplierId, rateId: item.rateId } });
    const { token, expiresAt } = await mintSupplierResponseToken(actor, lock.id, "availability-response", 72);
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: item.supplierId } });
    let emailed = false;
    if (supplier.email) {
      const sent = await notify({
        event: "supplier.availability-request",
        channels: ["EMAIL"],
        to: { email: supplier.email },
        bookingId,
        template: {
          name: "supplierRequest",
          input: {
            name: supplier.contactPerson ?? supplier.name,
            reference: booking.reference,
            details: [
              `Service: ${line.serviceName} × ${line.quantity}.`,
              `Dates: ${lock.startsAt.toLocaleDateString("en-GB")} → ${lock.endsAt.toLocaleDateString("en-GB")}.`,
              `Your rate on file: ${formatMoney(lock.rate?.costCents ?? 0, lock.rate?.currency ?? "USD")}. Reply within 72 hours.`,
            ],
            ctaUrl: `${SITE_URL}/supplier-response/${token}`,
            ctaLabel: "Accept, decline or counter",
          },
        },
        dedupeKey: `supplier:${lock.id}:request`,
      });
      emailed = sent.some((r) => r.status === "SENT");
    }
    results.push({ lineId: line.id, lockId: lock.id, supplierId: supplier.id, token, tokenExpiresAt: expiresAt.toISOString(), emailed });
  }

  if (["NEW", "IN_REVIEW"].includes(booking.status)) {
    await prisma.$transaction(async (tx) => {
      await applyTransition(tx, bookingId, "SUPPLIERS_PENDING", actor?.id ?? null, "Availability requested");
    });
  }
  return { locks: results };
}

// ---------------------------------------------------------------------------
// Supplier self-service (no login; single-purpose token)
// ---------------------------------------------------------------------------

export async function getSupplierResponseContext(token: string, now: Date = new Date()) {
  const record = await verifySupplierToken(token, now);
  const lock = record.lock;
  if (!lock) throw new NotFoundError("Supplier lock");
  // Supplier sees their own service, dates and cost — never client data.
  return {
    supplierName: lock.supplier.name,
    serviceName: lock.serviceName,
    startsAt: lock.startsAt.toISOString(),
    endsAt: lock.endsAt.toISOString(),
    quantity: lock.quantity,
    offeredCostCents: lock.rate?.costCents ?? null,
    offeredCurrency: lock.rate?.currency ?? null,
    status: lock.status,
    bookingReference: record.lock?.bookingRef ?? null,
    counterOfferCents: lock.counterOfferCents,
    expiresAt: record.expiresAt.toISOString(),
  };
}

export const supplierResponseInput = z.object({
  action: z.enum(["accept", "decline", "counter"]),
  amountCents: z.number().int().min(0).max(100_000_000).optional(),
  currency: z.enum(["KES", "USD"]).optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function respondToSupplierRequest(token: string, input: unknown, now: Date = new Date()) {
  const data = supplierResponseInput.parse(input);
  const record = await verifySupplierToken(token, now);
  if (!record.lockId || !record.lock) throw new NotFoundError("Supplier lock");
  if (record.lock.status !== "REQUESTED") {
    throw new WorkflowError(`This request is already ${record.lock.status.toLowerCase()}`);
  }
  if (data.action === "counter" && data.amountCents === undefined) {
    throw new WorkflowError("Counter-offers need an amount");
  }

  const lock = await prisma.$transaction(async (tx) => {
    const to = data.action === "accept" ? "HELD" : data.action === "decline" ? "DECLINED" : null;
    // Counters stay REQUESTED with the offer recorded; accept/decline move on.
    if (to && !LOCK_TRANSITIONS[record.lock?.status ?? "REQUESTED"].includes(to)) {
      throw new WorkflowError(`Cannot move supplier lock from ${record.lock?.status}`);
    }
    const updated = await tx.supplierLock.update({
      where: { id: record.lockId as string },
      data: {
        ...(to ? { status: to } : {}),
        ...(data.action === "counter"
          ? {
              counterOfferCents: data.amountCents as number,
              counterCurrency: data.currency ?? record.lock?.rate?.currency ?? "USD",
              responseNote: data.note ?? null,
              respondedAt: now,
            }
          : { responseNote: data.note ?? null, respondedAt: now }),
      },
      include: { supplier: true, rate: true },
    });
    await tx.supplierToken.update({ where: { id: record.id }, data: { usedAt: now } });
    await tx.auditLog.create({
      data: { actor: "supplier", action: `supplier-lock.${data.action}`, resource: "supplier-lock", resourceId: updated.id },
    });
    return updated;
  });
  // Token is single-purpose: consumed atomically with the response above.

  const staff = await businessContact();
  const outcome =
    data.action === "accept"
      ? `accepted and is now HELD`
      : data.action === "decline"
        ? `was DECLINED${data.note ? `: ${data.note}` : ""}`
        : `COUNTERED at ${formatMoney(data.amountCents ?? 0, data.currency ?? "USD")}${data.note ? ` — ${data.note}` : ""}`;
  const body = `Supplier ${lock.supplier.name} ${outcome} for ${lock.serviceName} (${lock.bookingRef}).`;
  await notify({
    event: "supplier.responded",
    channels: ["IN_APP"],
    bookingId: lock.bookingRef
      ? (await prisma.booking.findUnique({ where: { reference: lock.bookingRef }, select: { id: true } }))?.id
      : undefined,
    subject: `Supplier replied: ${lock.bookingRef}`,
    body,
    dedupeKey: `supplier:${lock.id}:${data.action}:${now.toISOString().slice(0, 16)}`,
  });
  if (staff.email) {
    await notify({
      event: "supplier.responded",
      channels: ["EMAIL"],
      to: { email: staff.email },
      subject: `Supplier replied: ${lock.bookingRef}`,
      body,
      dedupeKey: `supplier:${lock.id}:${data.action}:email:${now.toISOString().slice(0, 16)}`,
    });
  }
  return { lockId: lock.id, status: lock.status, counterOfferCents: lock.counterOfferCents };
}

// ---------------------------------------------------------------------------
// 3-5. Versioned quotes: draft -> approve -> send
// ---------------------------------------------------------------------------

export interface QuoteLineSnapshot {
  seq: number;
  serviceName: string;
  quantity: number;
  totalCents: number;
}

export interface QuoteDiff {
  added: QuoteLineSnapshot[];
  removed: QuoteLineSnapshot[];
  changed: { seq: number; serviceName: string; from: number; to: number }[];
  subtotalChanged: boolean;
  discountChanged: boolean;
  totalChanged: boolean;
}

function diffQuotes(previous: { lines: QuoteLineSnapshot[]; subtotalCents: number; discountCents: number; totalCents: number } | null, next: { lines: QuoteLineSnapshot[]; subtotalCents: number; discountCents: number; totalCents: number }): QuoteDiff {
  if (!previous) {
    return { added: next.lines, removed: [], changed: [], subtotalChanged: true, discountChanged: next.discountCents !== 0, totalChanged: true };
  }
  const prevBySeq = new Map(previous.lines.map((l) => [l.seq, l]));
  const nextBySeq = new Map(next.lines.map((l) => [l.seq, l]));
  return {
    added: next.lines.filter((l) => !prevBySeq.has(l.seq)),
    removed: previous.lines.filter((l) => !nextBySeq.has(l.seq)),
    changed: next.lines.flatMap((l) => {
      const before = prevBySeq.get(l.seq);
      return before && before.totalCents !== l.totalCents
        ? [{ seq: l.seq, serviceName: l.serviceName, from: before.totalCents, to: l.totalCents }]
        : [];
    }),
    subtotalChanged: previous.subtotalCents !== next.subtotalCents,
    discountChanged: previous.discountCents !== next.discountCents,
    totalChanged: previous.totalCents !== next.totalCents,
  };
}

async function latestVersion(bookingId: string) {
  return prisma.quoteVersion.findFirst({ where: { bookingId }, orderBy: { version: "desc" } });
}

function parseVersionLines(version: { lines: unknown }): QuoteLineSnapshot[] {
  return Array.isArray(version.lines) ? (version.lines as QuoteLineSnapshot[]) : [];
}

/** Build a draft snapshot from live service lines. All lines need HELD/CONFIRMED locks. */
export async function generateQuoteDraft(actor: Actor | null, bookingId: string) {
  gateOps(actor);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { serviceLines: { orderBy: { seq: "asc" }, include: { lock: true } } },
  });
  if (!booking) throw new NotFoundError("Booking");
  if (!["IN_REVIEW", "SUPPLIERS_PENDING", "CLIENT_REVISION", "QUOTE_DRAFT"].includes(booking.status)) {
    throw new WorkflowError(`Cannot draft a quote while the booking is ${booking.status}`);
  }
  if (booking.serviceLines.length === 0) {
    throw new WorkflowError("Add at least one service line before drafting");
  }
  const unlocked = booking.serviceLines.filter((l) => !l.lockId || !["HELD", "CONFIRMED"].includes(l.lock?.status ?? ""));
  if (unlocked.length > 0) {
    throw new WorkflowError(`These lines have no held supplier: ${unlocked.map((l) => l.serviceName).join(", ")}`);
  }

  const config = await loadPricingConfig();
  const lines: QuoteLineSnapshot[] = booking.serviceLines.map((l) => ({
    seq: l.seq,
    serviceName: l.serviceName,
    quantity: l.quantity,
    totalCents: l.clientPriceCents,
  }));
  const subtotal = lines.reduce((sum, l) => sum + l.totalCents, 0);
  const taxes = config.taxes.map((t) => ({
    name: t.name,
    amountCents: t.mode === "PERCENT" ? applyBps(subtotal, t.percentBps ?? 0) : (t.fixedCents ?? 0),
  }));
  const taxTotal = taxes.reduce((sum, t) => sum + t.amountCents, 0);
  const total = subtotal + taxTotal;
  const settings = await quoteSettings();
  const validUntil = new Date(Date.now() + settings.validityDays * 86_400_000);

  return prisma.$transaction(async (tx) => {
    const max = await tx.quoteVersion.aggregate({ where: { bookingId }, _max: { version: true } });
    const version = (max._max.version ?? 0) + 1;
    const previous = await tx.quoteVersion.findFirst({ where: { bookingId }, orderBy: { version: "desc" } });
    await tx.quoteVersion.updateMany({ where: { bookingId, status: "DRAFT" }, data: { status: "SUPERSEDED" } });
    const created = await tx.quoteVersion.create({
      data: {
        bookingId,
        version,
        status: "DRAFT",
        currency: booking.currency,
        lines: JSON.parse(JSON.stringify(lines)) as object,
        subtotalCents: subtotal,
        discountCents: 0,
        taxes: JSON.parse(JSON.stringify(taxes)) as object,
        taxTotalCents: taxTotal,
        totalCents: total,
        depositCents: applyBps(total, DEPOSIT_BPS),
        fxRates: JSON.parse(JSON.stringify(config.fxRates)) as object,
        validUntil,
        paymentTerms: settings.paymentTerms,
        cancellationTerms: settings.cancellationTerms,
        createdById: actor?.id ?? null,
      },
    });
    await tx.auditLog.create({
      data: { actor: actor?.id ?? "system", action: "quote.drafted", resource: "booking", resourceId: bookingId },
    });
    if (["IN_REVIEW", "SUPPLIERS_PENDING", "CLIENT_REVISION"].includes(booking.status)) {
      await applyTransition(tx, bookingId, "QUOTE_DRAFT", actor?.id ?? null, `Draft ${quoteVersionReference(booking.reference, version)}`);
    }
    const diff = diffQuotes(
      previous ? { lines: parseVersionLines(previous), subtotalCents: previous.subtotalCents, discountCents: previous.discountCents, totalCents: previous.totalCents } : null,
      { lines, subtotalCents: subtotal, discountCents: 0, totalCents: total },
    );
    return { version: created, diff };
  });
}

export const quoteEditInput = z.object({
  discountCents: z.number().int().min(0).max(100_000_000).optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  validUntil: z.string().datetime().optional(),
  paymentTerms: z.string().trim().max(4000).nullable().optional(),
  cancellationTerms: z.string().trim().max(4000).nullable().optional(),
});

/** Every save mints a new version; the diff shows what moved. */
export async function saveQuoteVersion(actor: Actor | null, bookingId: string, input: unknown) {
  gateOps(actor);
  const data = quoteEditInput.parse(input);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError("Booking");
  const previous = await latestVersion(bookingId);
  // Revisions (REVISION_REQUESTED) are the base for the next draft, exactly
  // like DRAFT/APPROVED — every save still mints a fresh DRAFT version.
  if (!previous || !["DRAFT", "APPROVED", "REVISION_REQUESTED"].includes(previous.status)) {
    throw new WorkflowError("Only a draft, approved or revision-requested quote can be edited — regenerate or revise first");
  }
  const prevLines = parseVersionLines(previous);
  const discount = Math.min(data.discountCents ?? previous.discountCents, previous.subtotalCents);
  const nextTotal = previous.subtotalCents - discount + previous.taxTotalCents;

  const created = await prisma.$transaction(async (tx) => {
    const max = await tx.quoteVersion.aggregate({ where: { bookingId }, _max: { version: true } });
    if (previous.status === "DRAFT") {
      await tx.quoteVersion.update({ where: { id: previous.id }, data: { status: "SUPERSEDED" } });
    }
    const next = await tx.quoteVersion.create({
      data: {
        bookingId,
        version: (max._max.version ?? 0) + 1,
        status: "DRAFT",
        currency: previous.currency,
        lines: previous.lines as object,
        subtotalCents: previous.subtotalCents,
        discountCents: discount,
        taxes: (previous.taxes ?? []) as object,
        taxTotalCents: previous.taxTotalCents,
        totalCents: nextTotal,
        depositCents: applyBps(nextTotal, DEPOSIT_BPS),
        fxRates: (previous.fxRates ?? {}) as object,
        validUntil: data.validUntil ? new Date(data.validUntil) : previous.validUntil,
        paymentTerms: data.paymentTerms !== undefined ? data.paymentTerms : previous.paymentTerms,
        cancellationTerms: data.cancellationTerms !== undefined ? data.cancellationTerms : previous.cancellationTerms,
        notes: data.notes !== undefined ? data.notes : previous.notes,
        createdById: actor?.id ?? null,
      },
    });
    await tx.auditLog.create({
      data: { actor: actor?.id ?? "system", action: "quote.edited", resource: "booking", resourceId: bookingId },
    });
    if (booking.status === "CLIENT_REVISION") {
      await applyTransition(tx, bookingId, "QUOTE_DRAFT", actor?.id ?? null, "Revision saved");
    }
    return next;
  });
  const diff = diffQuotes(
    { lines: prevLines, subtotalCents: previous.subtotalCents, discountCents: previous.discountCents, totalCents: previous.totalCents },
    { lines: parseVersionLines(created), subtotalCents: created.subtotalCents, discountCents: created.discountCents, totalCents: created.totalCents },
  );
  return { version: created, diff };
}

export async function approveQuote(actor: Actor | null, bookingId: string) {
  gateOps(actor);
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking");
    const version = await tx.quoteVersion.findFirst({ where: { bookingId, status: "DRAFT" }, orderBy: { version: "desc" } });
    if (!version) throw new WorkflowError("No draft quote to approve");
    await tx.quoteVersion.update({ where: { id: version.id }, data: { status: "APPROVED" } });
    await tx.auditLog.create({
      data: { actor: actor?.id ?? "system", action: "quote.approved", resource: "booking", resourceId: bookingId },
    });
    if (booking.status === "QUOTE_DRAFT") {
      await applyTransition(tx, bookingId, "QUOTE_APPROVED", actor?.id ?? null, `Approved ${quoteVersionReference(booking.reference, version.version)}`);
    }
    return tx.quoteVersion.findUniqueOrThrow({ where: { id: version.id } });
  });
}

export async function sendQuote(actor: Actor | null, bookingId: string) {
  gateOps(actor);
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking");
    const version = await tx.quoteVersion.findFirst({ where: { bookingId, status: "APPROVED" }, orderBy: { version: "desc" } });
    if (!version) throw new WorkflowError("Approve the quote before sending");
    if (version.validUntil < new Date()) throw new WorkflowError("Quote validity lapsed — regenerate first");
    await tx.quoteVersion.update({ where: { id: version.id }, data: { status: "SENT" } });
    await tx.auditLog.create({
      data: { actor: actor?.id ?? "system", action: "quote.sent", resource: "booking", resourceId: bookingId },
    });
    if (booking.status === "QUOTE_APPROVED") {
      await applyTransition(tx, bookingId, "QUOTE_SENT", actor?.id ?? null, `Sent ${quoteVersionReference(booking.reference, version.version)}`);
    }
    return { bookingId: booking.id, versionId: version.id, versionNumber: version.version };
  });
  const version = await prisma.quoteVersion.findUniqueOrThrow({ where: { id: result.versionId } });
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: result.bookingId } });
  await notify({
    event: "quote.sent",
    channels: ["EMAIL", "IN_APP"],
    to: { email: booking.customerEmail, userId: booking.userId ?? undefined },
    bookingId: booking.id,
    template: {
      name: "quoteSent",
      input: {
        name: booking.customerName,
        reference: quoteVersionReference(booking.reference, version.version),
        amount: formatMoney(version.totalCents, version.currency),
        ctaUrl: `${SITE_URL}/safari/${booking.reference}`,
        ctaLabel: "View my quote",
      },
    },
    dedupeKey: `quote:${version.id}:sent`,
  });
  return version;
}

// ---------------------------------------------------------------------------
// 6. Client answers: accept or request changes
// ---------------------------------------------------------------------------

export async function latestClientQuote(user: SafeUser | null, reference: string) {
  const booking = await requireBookingAccess(user, reference);
  const version = await prisma.quoteVersion.findFirst({
    where: { bookingId: booking.id, status: { in: ["SENT", "ACCEPTED"] } },
    orderBy: { version: "desc" },
  });
  if (!version) throw new NotFoundError("Quote");
  return { booking: { reference: booking.reference, status: booking.status }, version };
}

export async function acceptQuote(user: SafeUser | null, reference: string) {
  if (!user) throw new UnauthorizedError();
  const booking = await requireBookingAccess(user, reference);
  const version = await prisma.quoteVersion.findFirst({
    where: { bookingId: booking.id, status: "SENT" },
    orderBy: { version: "desc" },
  });
  if (!version) throw new WorkflowError("No sent quote to accept");
  if (version.validUntil < new Date()) throw new WorkflowError("This quote expired — ask your planner for a fresh one");

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quoteVersion.update({ where: { id: version.id }, data: { status: "ACCEPTED" } });
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        subtotalCents: version.subtotalCents,
        discountCents: version.discountCents,
        totalCents: version.totalCents,
        depositCents: version.depositCents,
        snapshot: JSON.parse(JSON.stringify({ quoteVersionId: version.id, version: version.version, lines: version.lines, totals: { subtotal: version.subtotalCents, discount: version.discountCents, tax: version.taxTotalCents, total: version.totalCents, deposit: version.depositCents }, fxRates: version.fxRates })) as object,
      },
    });
    await tx.auditLog.create({
      data: { actor: user.id, action: "quote.accepted", resource: "booking", resourceId: booking.id },
    });
    const fresh = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
    if (fresh.status === "QUOTE_SENT") {
      await applyTransition(tx, booking.id, "AWAITING_PAYMENT", user.id, `Accepted ${quoteVersionReference(booking.reference, version.version)}`);
    }
    return tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
  });

  const staff = await businessContact();
  if (staff.email) {
    await notify({
      event: "quote.accepted",
      channels: ["EMAIL", "IN_APP"],
      to: { email: staff.email },
      bookingId: booking.id,
      subject: `Quote accepted: ${booking.reference}`,
      body: `${booking.customerName} accepted ${quoteVersionReference(booking.reference, version.version)} (${formatMoney(version.totalCents, version.currency)}). Take the deposit.`,
      dedupeKey: `quote:${version.id}:accepted-staff`,
    });
  }
  return updated;
}

export const revisionInput = z.object({
  comments: z.string().trim().min(10).max(4000),
});

export async function requestQuoteRevision(user: SafeUser | null, reference: string, input: unknown) {
  if (!user) throw new UnauthorizedError();
  const data = revisionInput.parse(input);
  const booking = await requireBookingAccess(user, reference);
  const version = await prisma.quoteVersion.findFirst({
    where: { bookingId: booking.id, status: "SENT" },
    orderBy: { version: "desc" },
  });
  if (!version) throw new WorkflowError("No sent quote to revise");

  await prisma.$transaction(async (tx) => {
    await tx.quoteVersion.update({ where: { id: version.id }, data: { status: "REVISION_REQUESTED", revisionNotes: data.comments } });
    await tx.auditLog.create({
      data: { actor: user.id, action: "quote.revision-requested", resource: "booking", resourceId: booking.id },
    });
    const fresh = await tx.booking.findUniqueOrThrow({ where: { id: booking.id } });
    if (fresh.status === "QUOTE_SENT") {
      await applyTransition(tx, booking.id, "CLIENT_REVISION", user.id, data.comments.slice(0, 200));
    }
  });

  const staff = await businessContact();
  if (staff.email) {
    await notify({
      event: "quote.revision-requested",
      channels: ["EMAIL", "IN_APP"],
      to: { email: staff.email },
      bookingId: booking.id,
      subject: `Changes requested: ${booking.reference}`,
      body: `${booking.customerName} asked for changes on ${quoteVersionReference(booking.reference, version.version)}: ${data.comments}`,
      dedupeKey: `quote:${version.id}:revision`,
    });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// 7-9. Expiry, warnings, pre-trip reminders, sweep
// ---------------------------------------------------------------------------

/** Expire lapsed quote versions; SENT expiries release HELD locks. */
export async function expireQuoteVersions(now: Date = new Date()): Promise<{ versions: number; bookings: number; locks: number }> {
  const due = await prisma.quoteVersion.findMany({
    where: { status: { in: ["DRAFT", "APPROVED", "SENT"] }, validUntil: { lt: now } },
    select: { id: true, bookingId: true, status: true, version: true },
  });
  let versions = 0;
  let bookings = 0;
  let locks = 0;
  for (const version of due) {
    const result = await prisma.$transaction(async (tx) => {
      const fresh = await tx.quoteVersion.findUnique({ where: { id: version.id } });
      if (!fresh || !["DRAFT", "APPROVED", "SENT"].includes(fresh.status)) return null;
      await tx.quoteVersion.update({ where: { id: version.id }, data: { status: "EXPIRED" } });
      const booking = await tx.booking.findUniqueOrThrow({ where: { id: version.bookingId } });
      let released = 0;
      if (fresh.status === "SENT") {
        const held = await tx.supplierLock.updateMany({
          where: { bookingRef: booking.reference, status: "HELD" },
          data: { status: "RELEASED" },
        });
        released = held.count;
      }
      let expiredBooking = false;
      if (["QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT", "CLIENT_REVISION"].includes(booking.status)) {
        await tx.booking.update({ where: { id: booking.id }, data: { status: "EXPIRED" } });
        await tx.bookingStatusHistory.create({
          data: { bookingId: booking.id, from: booking.status, to: "EXPIRED", actorId: null, reason: `Quote ${quoteVersionReference(booking.reference, version.version)} expired` },
        });
        expiredBooking = true;
      }
      return { released, expiredBooking };
    });
    if (result) {
      versions += 1;
      locks += result.released;
      if (result.expiredBooking) bookings += 1;
    }
  }
  return { versions, bookings, locks };
}

/** Warn admins 48h before a SENT quote lapses (locks release on expiry). */
export async function quoteExpiryWarnings(now: Date = new Date()): Promise<number> {
  const soon = new Date(now.getTime() + 48 * 3600_000);
  const versions = await prisma.quoteVersion.findMany({
    where: { status: "SENT", validUntil: { gte: now, lt: soon } },
    include: { booking: { select: { id: true, reference: true, customerName: true } } },
  });
  const staff = await businessContact();
  let warned = 0;
  for (const version of versions) {
    const day = version.validUntil.toISOString().slice(0, 10);
    const results = await notify({
      event: "quote.expiring",
      channels: staff.email ? ["IN_APP", "EMAIL"] : ["IN_APP"],
      to: staff.email ? { email: staff.email } : {},
      bookingId: version.bookingId,
      subject: `Quote expiring: ${version.booking.reference}`,
      body: `${quoteVersionReference(version.booking.reference, version.version)} for ${version.booking.customerName} lapses ${version.validUntil.toLocaleDateString("en-GB")}. Held supplier locks release on expiry.`,
      dedupeKey: `quote:${version.id}:expiring:${day}`,
    });
    if (results.some((r) => r.status === "SENT")) warned += 1;
  }
  return warned;
}

/** 7-day client + supplier reminders; 24-hour supplier ping. */
export async function sendPreTripReminders(now: Date = new Date()): Promise<{ sevenDay: number; supplierDay: number }> {
  const weekFrom = new Date(now.getTime() + 6 * 86_400_000);
  const weekTo = new Date(now.getTime() + 8 * 86_400_000);
  const dayFrom = new Date(now.getTime() + 23 * 3600_000);
  const dayTo = new Date(now.getTime() + 25 * 3600_000);

  const weekTrips = await prisma.booking.findMany({
    where: { status: "CONFIRMED", travelStart: { gte: weekFrom, lt: weekTo } },
    select: { id: true, reference: true, customerName: true, customerEmail: true, userId: true, travelStart: true },
  });
  let sevenDay = 0;
  for (const trip of weekTrips) {
    const date = trip.travelStart?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const results = await notify({
      event: "trip.pre-trip",
      channels: ["EMAIL", "IN_APP"],
      to: { email: trip.customerEmail, userId: trip.userId ?? undefined },
      bookingId: trip.id,
      template: {
        name: "preTripChecklist",
        input: {
          name: trip.customerName,
          reference: trip.reference,
          details: [
            "Passport details for every traveller.",
            "Final balance settled.",
            date ? `Wheels up ${date} — 7 days to go.` : "Your safari starts in a week.",
          ],
        },
      },
      dedupeKey: `pretrip:${trip.id}:${trip.travelStart?.toISOString().slice(0, 10)}`,
    });
    if (results.some((r) => r.status === "SENT")) sevenDay += 1;
  }

  const dayLocks = await prisma.supplierLock.findMany({
    where: { status: "CONFIRMED", startsAt: { gte: dayFrom, lt: dayTo } },
    include: { supplier: { select: { name: true, email: true } } },
  });
  let supplierDay = 0;
  for (const lock of dayLocks) {
    if (!lock.supplier.email) continue;
    const results = await notify({
      event: "supplier.pre-trip",
      channels: ["EMAIL"],
      to: { email: lock.supplier.email },
      subject: `Tomorrow: ${lock.bookingRef}`,
      body: `${lock.supplier.name}, reminder: ${lock.serviceName} × ${lock.quantity} starts tomorrow for booking ${lock.bookingRef}.`,
      dedupeKey: `supplier-pretrip:${lock.id}:${lock.startsAt.toISOString().slice(0, 10)}`,
    });
    if (results.some((r) => r.status === "SENT")) supplierDay += 1;
  }
  return { sevenDay, supplierDay };
}

export async function runWorkflowSweep(now: Date = new Date()) {
  const [expired, warned, reminders] = await Promise.all([
    expireQuoteVersions(now),
    quoteExpiryWarnings(now),
    sendPreTripReminders(now),
  ]);
  return { expired, warned, reminders };
}
