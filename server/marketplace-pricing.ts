import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { applyBps, BASE_CURRENCY, DEPOSIT_BPS } from "@/lib/money";
import { ForbiddenError, UnauthorizedError, hasPermission } from "@/lib/permissions";
import { ConflictError, NotFoundError, type Actor } from "@/server/catalogue";
import { recordAudit } from "@/server/operations";

/**
 * Marketplace pricing engine (Phase 3). ALL pricing math lives here — pure
 * functions below, DB-backed rule/tax admin and ServiceLine persistence
 * after them. No pricing math in UI components.
 *
 * Money rules:
 * - Integer minor units everywhere; a single Math.round per line boundary.
 * - Per-line order: scale cost (unit x qty x pax) -> convert currency ->
 *   apply markup -> round client price to the configured increment.
 * - Booking order: sum lines -> booking discount (clamped to subtotal) ->
 *   taxes (percent on the discounted subtotal, fixed added flat) -> total.
 * - markup % = markup / cost. margin % = income / client price. A 25%
 *   markup is a 20% margin — both are computed and shown, never conflated.
 * - Rule priority: line override > supplier > service type > global default.
 * - Fixed-amount rules are interpreted in the priced (booking) currency:
 *   the DB layer converts them from the rule currency at the recorded FX
 *   rate before the pure engine runs.
 */

export class MarketplacePricingError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateOps(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (!hasPermission(actor.role, "bookings.write")) throw new ForbiddenError("bookings.write");
}

// ---------------------------------------------------------------------------
// Pure engine (no database; fully unit-testable)
// ---------------------------------------------------------------------------

export type MarkupModeValue = "PERCENT" | "FIXED";
export type MarkupSource = "LINE" | "SUPPLIER" | "SERVICE_TYPE" | "GLOBAL";
export type RateUnitValue =
  | "PER_VEHICLE_PER_DAY"
  | "PER_PERSON_PER_NIGHT"
  | "PER_TRANSFER"
  | "PER_ACTIVITY"
  | "PER_GROUP";

export interface MarkupCandidate {
  mode: MarkupModeValue;
  /** Basis points when PERCENT. */
  percentBps?: number;
  /** Minor units in the priced currency when FIXED. */
  fixedCents?: number;
}

export interface ResolvedMarkup extends MarkupCandidate {
  source: MarkupSource;
}

export interface MarkupRuleSet {
  line?: MarkupCandidate;
  supplier?: MarkupCandidate | null;
  serviceType?: MarkupCandidate | null;
  global: MarkupCandidate;
}

/** Priority: line override > supplier > service type > global default. */
export function resolveMarkup(rules: MarkupRuleSet): ResolvedMarkup {
  if (rules.line) return { ...rules.line, source: "LINE" };
  if (rules.supplier) return { ...rules.supplier, source: "SUPPLIER" };
  if (rules.serviceType) return { ...rules.serviceType, source: "SERVICE_TYPE" };
  return { ...rules.global, source: "GLOBAL" };
}

function assertMarkup(candidate: MarkupCandidate): void {
  if (candidate.mode === "PERCENT") {
    if (!Number.isInteger(candidate.percentBps) || (candidate.percentBps ?? -1) < 0) {
      throw new MarketplacePricingError("Percent markup needs non-negative integer basis points");
    }
  } else if (!Number.isInteger(candidate.fixedCents) || (candidate.fixedCents ?? -1) < 0) {
    throw new MarketplacePricingError("Fixed markup needs non-negative integer minor units");
  }
}

export interface ScaleCostInput {
  unit: RateUnitValue;
  /** Supplier cost per unit, in the supplier's currency minor units. */
  unitCostCents: number;
  /** Nights / days / transfers / groups depending on unit. */
  quantity: number;
  /** Travellers; multiplies per-person units only. Defaults to 1. */
  pax?: number;
}

/**
 * Scale a rate to a line cost. Per-person units (per night, per activity)
 * multiply by pax; vehicle/group/transfer units never do.
 */
export function scaleLineCost(input: ScaleCostInput): number {
  const { unit, unitCostCents, quantity } = input;
  const pax = input.pax ?? 1;
  for (const [name, value] of [
    ["unitCostCents", unitCostCents],
    ["quantity", quantity],
    ["pax", pax],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new MarketplacePricingError(`${name} must be a non-negative integer`);
    }
  }
  if (quantity < 1) throw new MarketplacePricingError("quantity must be at least 1");
  if (pax < 1) throw new MarketplacePricingError("pax must be at least 1");
  const persons = unit === "PER_PERSON_PER_NIGHT" || unit === "PER_ACTIVITY" ? pax : 1;
  return unitCostCents * quantity * persons;
}

/** Convert minor units between currencies via explicit rate snapshots. */
export function convertCost(amountCents: number, fromRateToBase: number, toRateToBase: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new MarketplacePricingError("amountCents must be a non-negative integer");
  }
  if (!(fromRateToBase > 0) || !(toRateToBase > 0)) {
    throw new MarketplacePricingError("Currency rates must be positive");
  }
  return Math.round((amountCents / fromRateToBase) * toRateToBase);
}

/** Round to a configurable increment (half up). increment 1 = exact. */
export function roundToIncrement(amountCents: number, increment: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new MarketplacePricingError("amountCents must be a non-negative integer");
  }
  if (!Number.isInteger(increment) || increment < 1) {
    throw new MarketplacePricingError("Rounding increment must be a positive integer");
  }
  return Math.round(amountCents / increment) * increment;
}

/** Markup amount over cost (pre-rounding). */
export function markupAmount(costCents: number, markup: ResolvedMarkup): number {
  assertMarkup(markup);
  if (markup.mode === "PERCENT") return applyBps(costCents, markup.percentBps ?? 0);
  return markup.fixedCents ?? 0;
}

/** markup % in basis points: markup / cost. */
export function markupBps(costCents: number, markupCents: number): number {
  if (costCents <= 0) return 0;
  return Math.round((markupCents / costCents) * 10_000);
}

/** margin % in basis points: income / client price. */
export function marginBps(costCents: number, clientCents: number): number {
  if (clientCents <= 0) return 0;
  return Math.round(((clientCents - costCents) / clientCents) * 10_000);
}

export function formatPct(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export interface TaxInput {
  name: string;
  mode: MarkupModeValue;
  percentBps?: number;
  fixedCents?: number;
}

export interface PricedLineInput extends ScaleCostInput {
  serviceName: string;
  serviceType: string;
  supplierId?: string;
  rateId?: string;
  costCurrency: string;
  lineMarkup?: MarkupCandidate;
}

export interface PricedLine {
  serviceName: string;
  serviceType: string;
  supplierId: string | null;
  rateId: string | null;
  quantity: number;
  pax: number | null;
  unit: RateUnitValue;
  currency: string;
  costCents: number;
  fxRate: number | null;
  markup: ResolvedMarkup;
  markupCents: number;
  markupPctBps: number;
  clientPriceCents: number;
  incomeCents: number;
  marginPctBps: number;
}

export interface BookingPriceRequest {
  lines: PricedLineInput[];
  currency: string;
  /** units of each currency per 1 base unit; base currency may be omitted (=1). */
  fxRates: Record<string, number>;
  roundingIncrement: number;
  supplierRules?: Record<string, MarkupCandidate>;
  serviceTypeRules?: Record<string, MarkupCandidate>;
  globalMarkup: MarkupCandidate;
  taxes?: TaxInput[];
  discountCents?: number;
}

export interface BookingPrice {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  taxLines: { name: string; amountCents: number }[];
  taxTotalCents: number;
  totalClientCents: number;
  totalCostCents: number;
  totalIncomeCents: number;
  blendedMarginBps: number;
  depositCents: number;
  currency: string;
}

function rateOrThrow(rates: Record<string, number>, currency: string): number {
  if (currency === BASE_CURRENCY) return 1;
  const rate = rates[currency];
  if (rate === undefined) throw new MarketplacePricingError(`No FX rate for ${currency}`);
  return rate;
}

export function priceBookingLines(request: BookingPriceRequest): BookingPrice {
  if (request.lines.length === 0) throw new MarketplacePricingError("At least one service line is required");
  if (request.lines.length > 100) throw new MarketplacePricingError("Too many service lines (max 100)");

  const lines: PricedLine[] = request.lines.map((input) => {
    const scaled = scaleLineCost(input);
    const costCents = convertCost(
      scaled,
      rateOrThrow(request.fxRates, input.costCurrency),
      rateOrThrow(request.fxRates, request.currency),
    );
    const markup = resolveMarkup({
      line: input.lineMarkup,
      supplier: input.supplierId ? (request.supplierRules?.[input.supplierId] ?? null) : null,
      serviceType: request.serviceTypeRules?.[input.serviceType] ?? null,
      global: request.globalMarkup,
    });
    const markupCents = markupAmount(costCents, markup);
    const clientPriceCents = roundToIncrement(costCents + markupCents, request.roundingIncrement);
    return {
      serviceName: input.serviceName,
      serviceType: input.serviceType,
      supplierId: input.supplierId ?? null,
      rateId: input.rateId ?? null,
      quantity: input.quantity,
      pax: input.unit === "PER_PERSON_PER_NIGHT" || input.unit === "PER_ACTIVITY" ? (input.pax ?? 1) : null,
      unit: input.unit,
      currency: request.currency,
      costCents,
      fxRate: input.costCurrency === request.currency ? null : rateOrThrow(request.fxRates, request.currency),
      markup,
      markupCents,
      markupPctBps: markupBps(costCents, markupCents),
      clientPriceCents,
      incomeCents: clientPriceCents - costCents,
      marginPctBps: marginBps(costCents, clientPriceCents),
    };
  });

  const subtotal = lines.reduce((sum, line) => sum + line.clientPriceCents, 0);
  if (request.discountCents !== undefined && (!Number.isInteger(request.discountCents) || request.discountCents < 0)) {
    throw new MarketplacePricingError("discountCents must be a non-negative integer");
  }
  const discount = Math.min(request.discountCents ?? 0, subtotal);
  const taxable = subtotal - discount;
  const taxLines = (request.taxes ?? []).map((tax) => {
    if (tax.mode === "PERCENT") {
      if (!Number.isInteger(tax.percentBps) || (tax.percentBps ?? -1) < 0) {
        throw new MarketplacePricingError(`Tax "${tax.name}" needs non-negative integer basis points`);
      }
      return { name: tax.name, amountCents: applyBps(taxable, tax.percentBps ?? 0) };
    }
    if (!Number.isInteger(tax.fixedCents) || (tax.fixedCents ?? -1) < 0) {
      throw new MarketplacePricingError(`Tax "${tax.name}" needs non-negative integer minor units`);
    }
    return { name: tax.name, amountCents: tax.fixedCents ?? 0 };
  });
  const taxTotal = taxLines.reduce((sum, line) => sum + line.amountCents, 0);
  const totalClient = taxable + taxTotal;
  const totalCost = lines.reduce((sum, line) => sum + line.costCents, 0);

  return {
    lines,
    subtotalCents: subtotal,
    discountCents: discount,
    taxLines,
    taxTotalCents: taxTotal,
    totalClientCents: totalClient,
    totalCostCents: totalCost,
    totalIncomeCents: totalClient - totalCost,
    blendedMarginBps: marginBps(totalCost, totalClient),
    depositCents: applyBps(totalClient, DEPOSIT_BPS),
    currency: request.currency,
  };
}

// ---------------------------------------------------------------------------
// DB-backed rule / tax administration
// ---------------------------------------------------------------------------

export const markupRuleInput = z.object({
  scope: z.enum(["GLOBAL", "SERVICE_TYPE", "SUPPLIER"]),
  scopeKey: z.string().trim().max(160).optional(),
  mode: z.enum(["PERCENT", "FIXED"]),
  percentBps: z.number().int().min(0).max(100_000).optional(),
  fixedCents: z.number().int().min(0).max(100_000_000).optional(),
  currency: z.enum(["KES", "USD"]).default("USD"),
});

export async function listMarkupRules(actor: Actor | null) {
  gateOps(actor);
  return prisma.markupRule.findMany({ orderBy: [{ scope: "asc" }, { scopeKey: "asc" }] });
}

export async function upsertMarkupRule(actor: Actor | null, input: unknown) {
  gateOps(actor);
  const data = markupRuleInput.parse(input);
  if (data.mode === "PERCENT" && data.percentBps === undefined) {
    throw new MarketplacePricingError("Percent rules need percentBps");
  }
  if (data.mode === "FIXED" && data.fixedCents === undefined) {
    throw new MarketplacePricingError("Fixed rules need fixedCents");
  }
  const scopeKey = data.scope === "GLOBAL" ? "" : (data.scopeKey ?? "");
  if (data.scope !== "GLOBAL" && !scopeKey) {
    throw new MarketplacePricingError("Non-global rules need a scope key (supplier id or service type)");
  }
  if (data.scope === "SUPPLIER") {
    const supplier = await prisma.supplier.findUnique({ where: { id: scopeKey } });
    if (!supplier) throw new NotFoundError("Supplier");
  }
  if (data.scope === "SERVICE_TYPE") {
    const type = await prisma.supplierType.findUnique({ where: { slug: scopeKey } });
    if (!type) throw new MarketplacePricingError(`Unknown service type: ${scopeKey}`);
  }
  try {
    const rule = await prisma.markupRule.upsert({
      where: { scope_scopeKey: { scope: data.scope, scopeKey } },
      update: {
        mode: data.mode,
        percentBps: data.mode === "PERCENT" ? (data.percentBps ?? 0) : null,
        fixedCents: data.mode === "FIXED" ? (data.fixedCents ?? 0) : null,
        currency: data.currency,
        active: true,
      },
      create: {
        scope: data.scope,
        scopeKey,
        mode: data.mode,
        percentBps: data.mode === "PERCENT" ? (data.percentBps ?? 0) : null,
        fixedCents: data.mode === "FIXED" ? (data.fixedCents ?? 0) : null,
        currency: data.currency,
        active: true,
      },
    });
    await recordAudit(actor?.id ?? null, "markup-rule.saved", "markup-rule", rule.id);
    return rule;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) throw new ConflictError("Markup rule conflict");
    throw error;
  }
}

export async function deleteMarkupRule(actor: Actor | null, id: string) {
  gateOps(actor);
  const rule = await prisma.markupRule.findUnique({ where: { id } });
  if (!rule) throw new NotFoundError("Markup rule");
  if (rule.scope === "GLOBAL") {
    throw new MarketplacePricingError("The global default cannot be deleted — set it to 0% instead");
  }
  await prisma.markupRule.delete({ where: { id } });
  await recordAudit(actor?.id ?? null, "markup-rule.deleted", "markup-rule", id);
}

export const taxFeeInput = z.object({
  name: z.string().trim().min(2).max(120),
  mode: z.enum(["PERCENT", "FIXED"]),
  percentBps: z.number().int().min(0).max(100_000).optional(),
  fixedCents: z.number().int().min(0).max(100_000_000).optional(),
  currency: z.enum(["KES", "USD"]).default("USD"),
  sortOrder: z.number().int().min(0).max(100).default(0),
});

export async function listTaxFees(actor: Actor | null, activeOnly = false) {
  gateOps(actor);
  return prisma.taxFee.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function upsertTaxFee(actor: Actor | null, id: string | null, input: unknown) {
  gateOps(actor);
  const data = taxFeeInput.parse(input);
  if (data.mode === "PERCENT" && data.percentBps === undefined) {
    throw new MarketplacePricingError("Percent taxes need percentBps");
  }
  if (data.mode === "FIXED" && data.fixedCents === undefined) {
    throw new MarketplacePricingError("Fixed taxes need fixedCents");
  }
  const record = id
    ? await prisma.taxFee.update({
        where: { id },
        data: {
          name: data.name,
          mode: data.mode,
          percentBps: data.mode === "PERCENT" ? (data.percentBps ?? 0) : null,
          fixedCents: data.mode === "FIXED" ? (data.fixedCents ?? 0) : null,
          currency: data.currency,
          sortOrder: data.sortOrder,
          active: true,
        },
      })
    : await prisma.taxFee.create({
        data: {
          name: data.name,
          mode: data.mode,
          percentBps: data.mode === "PERCENT" ? (data.percentBps ?? 0) : null,
          fixedCents: data.mode === "FIXED" ? (data.fixedCents ?? 0) : null,
          currency: data.currency,
          sortOrder: data.sortOrder,
          active: true,
        },
      });
  await recordAudit(actor?.id ?? null, "tax-fee.saved", "tax-fee", record.id);
  return record;
}

export async function setTaxFeeActive(actor: Actor | null, id: string, active: boolean) {
  gateOps(actor);
  const record = await prisma.taxFee.findUnique({ where: { id } });
  if (!record) throw new NotFoundError("Tax/fee");
  return prisma.taxFee.update({ where: { id }, data: { active } });
}

// ---------------------------------------------------------------------------
// Pricing configuration loader + service lines
// ---------------------------------------------------------------------------

export interface ConfiguredMarkup extends MarkupCandidate {
  ruleId: string;
  ruleCurrency: string;
}

export interface PricingConfig {
  globalMarkup: ConfiguredMarkup;
  supplierRules: Record<string, ConfiguredMarkup>;
  serviceTypeRules: Record<string, ConfiguredMarkup>;
  taxes: TaxInput[];
  roundingIncrement: number;
  fxRates: Record<string, number>;
}

async function fxRateMap(): Promise<Record<string, number>> {
  const rates = await prisma.currencyRate.findMany();
  const map: Record<string, number> = {};
  for (const rate of rates) map[rate.currency] = Number(rate.rateToBase);
  return map;
}

export async function loadPricingConfig(): Promise<PricingConfig> {
  const [rules, taxes, rates, rounding] = await Promise.all([
    prisma.markupRule.findMany({ where: { active: true } }),
    prisma.taxFee.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    fxRateMap(),
    prisma.siteSetting.findUnique({ where: { key: "pricing.roundingIncrementCents" } }),
  ]);
  const global = rules.find((r) => r.scope === "GLOBAL");
  if (!global) throw new MarketplacePricingError("Global default markup rule is missing — seed it first");
  const toConfigured = (rule: (typeof rules)[number]): ConfiguredMarkup => ({
    ...(rule.mode === "PERCENT"
      ? { mode: "PERCENT" as const, percentBps: rule.percentBps ?? 0 }
      : { mode: "FIXED" as const, fixedCents: rule.fixedCents ?? 0 }),
    ruleId: rule.id,
    ruleCurrency: rule.currency,
  });
  const supplierRules: PricingConfig["supplierRules"] = {};
  const serviceTypeRules: PricingConfig["serviceTypeRules"] = {};
  for (const rule of rules) {
    if (rule.scope === "SUPPLIER") supplierRules[rule.scopeKey] = toConfigured(rule);
    if (rule.scope === "SERVICE_TYPE") serviceTypeRules[rule.scopeKey] = toConfigured(rule);
  }
  return {
    globalMarkup: toConfigured(global),
    supplierRules,
    serviceTypeRules,
    taxes: taxes.map((t) => ({
      name: t.name,
      mode: t.mode,
      percentBps: t.percentBps ?? undefined,
      fixedCents: t.fixedCents ?? undefined,
    })),
    roundingIncrement: Math.max(1, Number(rounding?.value ?? "100") || 100),
    fxRates: rates,
  };
}

export const serviceLineInput = z.object({
  serviceName: z.string().trim().min(2).max(160),
  serviceType: z.string().trim().min(2).max(80),
  supplierId: z.string().cuid().optional(),
  rateId: z.string().cuid().optional(),
  unit: z.enum(["PER_VEHICLE_PER_DAY", "PER_PERSON_PER_NIGHT", "PER_TRANSFER", "PER_ACTIVITY", "PER_GROUP"]),
  /** Explicit line-total cost (custom one-off, no rate pinned). */
  costCents: z.number().int().min(0).max(100_000_000).optional(),
  currency: z.enum(["KES", "USD"]).default("USD"),
  quantity: z.number().int().min(1).max(1000).default(1),
  pax: z.number().int().min(1).max(60).optional(),
  lineMarkupBps: z.number().int().min(0).max(100_000).optional(),
  lineMarkupCents: z.number().int().min(0).max(100_000_000).optional(),
});

function fxOrThrow(rates: Record<string, number>, currency: string): number {
  if (currency === BASE_CURRENCY) return 1;
  const rate = rates[currency];
  if (rate === undefined) throw new MarketplacePricingError(`No FX rate for ${currency}`);
  return rate;
}

/**
 * Cost a service line against live rules and persist the full money trail:
 * supplier cost, applied rule, client price, income, currency + FX snapshot.
 * Fixed-amount rules convert from the rule currency into the booking
 * currency at the recorded rate before the pure engine runs.
 */
export async function addServiceLine(actor: Actor | null, bookingId: string, input: unknown) {
  gateOps(actor);
  const data = serviceLineInput.parse(input);
  if (data.lineMarkupBps !== undefined && data.lineMarkupCents !== undefined) {
    throw new MarketplacePricingError("Choose one line markup mode: percent or fixed");
  }

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundError("Booking");

    // Normalise cost to a scaled total in the booking currency.
    let scaledCost: number;
    let costCurrency: string;
    let rateId: string | null = null;
    let supplierId: string | null = data.supplierId ?? null;
    if (data.rateId) {
      const rate = await tx.supplierRate.findUnique({ where: { id: data.rateId } });
      if (!rate) throw new NotFoundError("Rate");
      if (supplierId && supplierId !== rate.supplierId) {
        throw new MarketplacePricingError("Supplier does not own this rate");
      }
      supplierId = rate.supplierId;
      scaledCost = scaleLineCost({ unit: data.unit, unitCostCents: rate.costCents, quantity: data.quantity, pax: data.pax });
      costCurrency = rate.currency;
      rateId = rate.id;
    } else if (data.costCents !== undefined) {
      scaledCost = data.costCents;
      costCurrency = data.currency;
    } else {
      throw new MarketplacePricingError("Provide a rate or an explicit cost");
    }
    if (supplierId) {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new NotFoundError("Supplier");
    }

    const config = await loadPricingConfig();
    const toBookingCurrency = (fixedCents: number, fromCurrency: string): number =>
      fromCurrency === booking.currency
        ? fixedCents
        : convertCost(fixedCents, fxOrThrow(config.fxRates, fromCurrency), fxOrThrow(config.fxRates, booking.currency));
    const asPriced = (rule: ConfiguredMarkup): MarkupCandidate =>
      rule.mode === "FIXED"
        ? { mode: "FIXED", fixedCents: toBookingCurrency(rule.fixedCents ?? 0, rule.ruleCurrency) }
        : { mode: "PERCENT", percentBps: rule.percentBps ?? 0 };

    const supplierRule = supplierId ? config.supplierRules[supplierId] : undefined;
    const typeRule = config.serviceTypeRules[data.serviceType];
    const priced = priceBookingLines({
      // A single synthetic line: scaled cost expressed as 1 unit so the
      // pure engine converts, marks up and rounds exactly once.
      lines: [
        {
          serviceName: data.serviceName,
          serviceType: data.serviceType,
          supplierId: supplierId ?? undefined,
          rateId: rateId ?? undefined,
          unit: "PER_GROUP",
          unitCostCents: convertCost(
            scaledCost,
            fxOrThrow(config.fxRates, costCurrency),
            fxOrThrow(config.fxRates, booking.currency),
          ),
          quantity: 1,
          costCurrency: booking.currency,
          lineMarkup:
            data.lineMarkupBps !== undefined
              ? { mode: "PERCENT", percentBps: data.lineMarkupBps }
              : data.lineMarkupCents !== undefined
                ? { mode: "FIXED", fixedCents: toBookingCurrency(data.lineMarkupCents, data.currency) }
                : undefined,
        },
      ],
      currency: booking.currency,
      fxRates: config.fxRates,
      roundingIncrement: config.roundingIncrement,
      supplierRules: supplierRule ? { [supplierId as string]: asPriced(supplierRule) } : {},
      serviceTypeRules: typeRule ? { [data.serviceType]: asPriced(typeRule) } : {},
      globalMarkup: asPriced(config.globalMarkup),
      taxes: [],
    });

    const line = priced.lines[0];
    if (!line) throw new MarketplacePricingError("Pricing produced no lines");
    const aggregate = await tx.serviceLine.aggregate({ where: { bookingId }, _max: { seq: true } });
    const created = await tx.serviceLine.create({
      data: {
        bookingId,
        seq: (aggregate._max.seq ?? 0) + 1,
        serviceName: data.serviceName,
        serviceType: data.serviceType,
        supplierId,
        rateId,
        quantity: data.quantity,
        pax:
          data.unit === "PER_PERSON_PER_NIGHT" || data.unit === "PER_ACTIVITY" ? (data.pax ?? 1) : null,
        unit: data.unit,
        currency: booking.currency,
        costCents: line.costCents,
        fxRate: costCurrency === booking.currency ? null : fxOrThrow(config.fxRates, booking.currency),
        markupMode: line.markup.mode,
        markupBps: line.markup.mode === "PERCENT" ? (line.markup.percentBps ?? 0) : null,
        markupFixedCents: line.markup.mode === "FIXED" ? (line.markup.fixedCents ?? 0) : null,
        markupSource: line.markup.source,
        markupRuleId:
          line.markup.source === "SUPPLIER" && supplierId
            ? (supplierRule?.ruleId ?? null)
            : line.markup.source === "SERVICE_TYPE"
              ? (typeRule?.ruleId ?? null)
              : line.markup.source === "GLOBAL"
                ? config.globalMarkup.ruleId
                : null,
        clientPriceCents: line.clientPriceCents,
        incomeCents: line.incomeCents,
      },
    });
    await tx.auditLog.create({
      data: { actor: actor?.id ?? "system", action: "service-line.added", resource: "booking", resourceId: bookingId },
    });
    return created;
  });
}

/**
 * Booking-level money summary from stored lines. Pure read — booking rows
 * carry no cost fields, so client payloads can never leak them.
 */
export async function bookingPricingSummary(actor: Actor | null, bookingId: string) {
  gateOps(actor);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { serviceLines: { orderBy: { seq: "asc" } } },
  });
  if (!booking) throw new NotFoundError("Booking");
  const config = await loadPricingConfig();
  const cost = booking.serviceLines.reduce((sum, line) => sum + line.costCents, 0);
  const client = booking.serviceLines.reduce((sum, line) => sum + line.clientPriceCents, 0);
  const taxes = config.taxes.map((tax) => ({
    name: tax.name,
    amountCents: tax.mode === "PERCENT" ? applyBps(client, tax.percentBps ?? 0) : (tax.fixedCents ?? 0),
  }));
  const taxTotal = taxes.reduce((sum, tax) => sum + tax.amountCents, 0);
  return {
    reference: booking.reference,
    currency: booking.currency,
    lines: booking.serviceLines,
    totalCostCents: cost,
    totalClientCents: client + taxTotal,
    totalIncomeCents: client + taxTotal - cost,
    blendedMarginBps: marginBps(cost, client + taxTotal),
    taxes,
    taxTotalCents: taxTotal,
  };
}

export async function removeServiceLine(actor: Actor | null, id: string) {
  gateOps(actor);
  const line = await prisma.serviceLine.findUnique({ where: { id } });
  if (!line) throw new NotFoundError("Service line");
  await prisma.serviceLine.delete({ where: { id } });
  await recordAudit(actor?.id ?? null, "service-line.removed", "booking", line.bookingId);
}

export async function listServiceLines(actor: Actor | null, bookingId: string) {
  gateOps(actor);
  return prisma.serviceLine.findMany({
    where: { bookingId },
    orderBy: { seq: "asc" },
    include: { supplier: { select: { name: true } }, rate: true },
  });
}
