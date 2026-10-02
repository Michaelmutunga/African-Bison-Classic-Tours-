import { z } from "zod";
import { formatInTimeZone } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { applyBps } from "@/lib/money";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import type { Actor } from "@/server/catalogue";
import { BOOKING_REFERENCE_TIMEZONE } from "@/server/booking-references";

/**
 * Admin-only reports (Phase 8). Every figure comes from live rows — no
 * snapshots, no estimates. Amounts are NEVER summed across currencies;
 * each split reports per currency.
 *
 * Cost, markup and margin data is finance-visible only: SUPER_ADMIN, ADMIN
 * and FINANCE_USER. (Full booking-agent/read-only role matrix is the
 * cross-cutting hardening pass.)
 */

export class ReportError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateFinance(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "finance.read")) throw new ForbiddenError("finance.read");
}

export const reportFilterInput = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export interface MoneySplit {
  currency: string;
  costCents: number;
  clientCents: number;
  incomeCents: number;
  /** margin % in basis points (income / client). */
  marginBps: number;
}

export interface BookingIncomeRow {
  bookingId: string;
  reference: string;
  customerName: string;
  status: string;
  createdAt: string;
  lines: number;
  splits: MoneySplit[];
}

function marginBps(cost: number, client: number): number {
  if (client <= 0) return 0;
  return Math.round(((client - cost) / client) * 10_000);
}

interface LineMoney {
  currency: string;
  costCents: number;
  clientPriceCents: number;
}

function splitLines(lines: LineMoney[]): MoneySplit[] {
  const byCurrency = new Map<string, { cost: number; client: number }>();
  for (const line of lines) {
    const entry = byCurrency.get(line.currency) ?? { cost: 0, client: 0 };
    entry.cost += line.costCents;
    entry.client += line.clientPriceCents;
    byCurrency.set(line.currency, entry);
  }
  return [...byCurrency.entries()].map(([currency, totals]) => ({
    currency,
    costCents: totals.cost,
    clientCents: totals.client,
    incomeCents: totals.client - totals.cost,
    marginBps: marginBps(totals.cost, totals.client),
  }));
}

function windowFilter(filters: z.infer<typeof reportFilterInput>) {
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;
  if (from && to && !(from < to)) throw new ReportError("Report window must end after it starts");
  return { gte: from, lte: to };
}

/** Income per booking, newest first. Excludes voided bookings. */
export async function incomePerBooking(actor: Actor | null, filters: unknown): Promise<BookingIncomeRow[]> {
  gateFinance(actor);
  const range = windowFilter(reportFilterInput.parse(filters));
  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ["CANCELLED", "EXPIRED"] },
      ...(range.gte || range.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      reference: true,
      customerName: true,
      status: true,
      createdAt: true,
      serviceLines: { select: { currency: true, costCents: true, clientPriceCents: true } },
    },
  });
  return bookings.map((b) => ({
    bookingId: b.id,
    reference: b.reference,
    customerName: b.customerName,
    status: b.status,
    createdAt: b.createdAt.toISOString(),
    lines: b.serviceLines.length,
    splits: splitLines(b.serviceLines),
  }));
}

export interface MonthIncomeRow {
  month: string;
  pipeline: MoneySplit[];
  realised: MoneySplit[];
}

/** Income per Nairobi calendar month: pipeline (open) vs realised (COMPLETED). */
export async function incomePerMonth(actor: Actor | null, filters: unknown): Promise<MonthIncomeRow[]> {
  gateFinance(actor);
  const range = windowFilter(reportFilterInput.parse(filters));
  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ["CANCELLED", "EXPIRED", "REFUNDED"] },
      ...(range.gte || range.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 1000,
    select: {
      createdAt: true,
      status: true,
      serviceLines: { select: { currency: true, costCents: true, clientPriceCents: true } },
    },
  });
  const months = new Map<string, { pipeline: LineMoney[]; realised: LineMoney[] }>();
  for (const booking of bookings) {
    const month = formatInTimeZone(booking.createdAt, BOOKING_REFERENCE_TIMEZONE, "yyyy-MM");
    const entry = months.get(month) ?? { pipeline: [], realised: [] };
    const lines = booking.serviceLines.map((l) => ({
      currency: l.currency,
      costCents: l.costCents,
      clientPriceCents: l.clientPriceCents,
    }));
    if (booking.status === "COMPLETED") entry.realised.push(...lines);
    else entry.pipeline.push(...lines);
    months.set(month, entry);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({ month, pipeline: splitLines(totals.pipeline), realised: splitLines(totals.realised) }));
}

export interface SupplierIncomeRow {
  supplierId: string | null;
  supplierName: string;
  lines: number;
  splits: MoneySplit[];
}

/** Income per supplier (plus the unassigned bucket). */
export async function incomePerSupplier(actor: Actor | null, filters: unknown): Promise<SupplierIncomeRow[]> {
  gateFinance(actor);
  const range = windowFilter(reportFilterInput.parse(filters));
  const lines = await prisma.serviceLine.findMany({
    where: {
      booking: {
        status: { notIn: ["CANCELLED", "EXPIRED"] },
        ...(range.gte || range.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
      },
    },
    take: 2000,
    select: {
      currency: true,
      costCents: true,
      clientPriceCents: true,
      supplierId: true,
      supplier: { select: { name: true } },
    },
  });
  const groups = new Map<string, { name: string; lines: LineMoney[] }>();
  for (const line of lines) {
    const key = line.supplierId ?? "unassigned";
    const entry = groups.get(key) ?? { name: line.supplier?.name ?? "Unassigned", lines: [] };
    entry.lines.push({ currency: line.currency, costCents: line.costCents, clientPriceCents: line.clientPriceCents });
    groups.set(key, entry);
  }
  return [...groups.entries()]
    .map(([supplierId, group]) => ({
      supplierId: supplierId === "unassigned" ? null : supplierId,
      supplierName: group.name,
      lines: group.lines.length,
      splits: splitLines(group.lines),
    }))
    .sort((a, b) => {
      const income = (splits: MoneySplit[]) => splits.reduce((sum, s) => sum + s.incomeCents, 0);
      return income(b.splits) - income(a.splits);
    });
}

export interface ServiceTypeIncomeRow {
  serviceType: string;
  lines: number;
  splits: MoneySplit[];
}

/** Income per service type. */
export async function incomePerServiceType(actor: Actor | null, filters: unknown): Promise<ServiceTypeIncomeRow[]> {
  gateFinance(actor);
  const range = windowFilter(reportFilterInput.parse(filters));
  const lines = await prisma.serviceLine.findMany({
    where: {
      booking: {
        status: { notIn: ["CANCELLED", "EXPIRED"] },
        ...(range.gte || range.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
      },
    },
    take: 2000,
    select: { serviceType: true, currency: true, costCents: true, clientPriceCents: true },
  });
  const groups = new Map<string, LineMoney[]>();
  for (const line of lines) {
    const entry = groups.get(line.serviceType) ?? [];
    entry.push({ currency: line.currency, costCents: line.costCents, clientPriceCents: line.clientPriceCents });
    groups.set(line.serviceType, entry);
  }
  return [...groups.entries()]
    .map(([serviceType, group]) => ({ serviceType, lines: group.length, splits: splitLines(group) }))
    .sort((a, b) => b.lines - a.lines);
}

export interface OutstandingClientRow {
  bookingId: string;
  reference: string;
  customerName: string;
  status: string;
  currency: string;
  pricedCents: number;
  paidCents: number;
  outstandingCents: number;
}

/** Outstanding client balances: priced lines + active taxes − paid. */
export async function outstandingClients(actor: Actor | null): Promise<OutstandingClientRow[]> {
  gateFinance(actor);
  const [bookings, taxes] = await Promise.all([
    prisma.booking.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"] } },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        reference: true,
        customerName: true,
        status: true,
        currency: true,
        paidCents: true,
        serviceLines: { select: { currency: true, clientPriceCents: true } },
      },
    }),
    prisma.taxFee.findMany({ where: { active: true }, select: { mode: true, percentBps: true, fixedCents: true } }),
  ]);
  const rows: OutstandingClientRow[] = [];
  for (const booking of bookings) {
    const client = booking.serviceLines.reduce((sum, l) => sum + l.clientPriceCents, 0);
    const tax = taxes.reduce(
      (sum, t) => sum + (t.mode === "PERCENT" ? applyBps(client, t.percentBps ?? 0) : (t.fixedCents ?? 0)),
      0,
    );
    const priced = client + tax;
    const outstanding = priced - booking.paidCents;
    if (outstanding > 0) {
      rows.push({
        bookingId: booking.id,
        reference: booking.reference,
        customerName: booking.customerName,
        status: booking.status,
        currency: booking.currency,
        pricedCents: priced,
        paidCents: booking.paidCents,
        outstandingCents: outstanding,
      });
    }
  }
  return rows;
}

export interface OutstandingPayoutRow {
  supplierId: string;
  supplierName: string;
  payouts: number;
  splits: { currency: string; dueCents: number }[];
}

/** Outstanding supplier payouts (DUE), grouped by supplier. */
export async function outstandingPayouts(actor: Actor | null): Promise<OutstandingPayoutRow[]> {
  gateFinance(actor);
  const payouts = await prisma.supplierPayout.findMany({
    where: { status: "DUE" },
    take: 1000,
    select: { supplierId: true, currency: true, amountCents: true, supplier: { select: { name: true } } },
  });
  const groups = new Map<string, { name: string; payouts: number; splits: Map<string, number> }>();
  for (const payout of payouts) {
    const entry = groups.get(payout.supplierId) ?? { name: payout.supplier.name, payouts: 0, splits: new Map() };
    entry.payouts += 1;
    entry.splits.set(payout.currency, (entry.splits.get(payout.currency) ?? 0) + payout.amountCents);
    groups.set(payout.supplierId, entry);
  }
  return [...groups.entries()].map(([supplierId, group]) => ({
    supplierId,
    supplierName: group.name,
    payouts: group.payouts,
    splits: [...group.splits.entries()].map(([currency, dueCents]) => ({ currency, dueCents })),
  }));
}

export interface FunnelReport {
  submitted: number;
  confirmed: number;
  /** Share of submitted bookings that ever reached CONFIRMED, in percent (0–100). */
  conversionPct: number;
  /** Mean hours from submission to first QUOTE_SENT, null when no quotes sent. */
  avgHoursToQuote: number | null;
}

/** Conversion NEW → CONFIRMED and average time to first quote. */
export async function funnelReport(actor: Actor | null, filters: unknown): Promise<FunnelReport> {
  gateFinance(actor);
  const range = windowFilter(reportFilterInput.parse(filters));
  const bookings = await prisma.booking.findMany({
    where: {
      ...(range.gte || range.lte ? { createdAt: { gte: range.gte, lte: range.lte } } : {}),
    },
    take: 2000,
    select: {
      id: true,
      createdAt: true,
      history: { orderBy: { createdAt: "asc" }, select: { to: true, createdAt: true } },
    },
  });
  let confirmed = 0;
  const quoteHours: number[] = [];
  for (const booking of bookings) {
    if (booking.history.some((h) => h.to === "CONFIRMED")) confirmed += 1;
    const sent = booking.history.find((h) => h.to === "QUOTE_SENT");
    if (sent) quoteHours.push((sent.createdAt.getTime() - booking.createdAt.getTime()) / 3_600_000);
  }
  return {
    submitted: bookings.length,
    confirmed,
    conversionPct: bookings.length === 0 ? 0 : Math.round((confirmed / bookings.length) * 1000) / 10,
    avgHoursToQuote:
      quoteHours.length === 0 ? null : Math.round((quoteHours.reduce((a, b) => a + b, 0) / quoteHours.length) * 10) / 10,
  };
}
