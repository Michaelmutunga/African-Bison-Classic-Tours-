import { Prisma, type QuoteStatus } from "@prisma/client";
import { z } from "zod";
import { BASE_CURRENCY, CHILD_RATE_BPS, DEPOSIT_BPS, SUPPORTED_CURRENCIES, applyBps, convertCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, type Actor } from "@/server/catalogue";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";

export const ENGINE_VERSION = "1";

export class PricingError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

function gateWrite(actor: Actor | null): void {
  if (!actor) throw new UnauthorizedError();
  if (actor.role !== "ADMIN" && actor.role !== "SUPER_ADMIN" && actor.role !== "CONTENT_MANAGER") {
    throw new ForbiddenError("catalogue.write");
  }
}

// ---------------------------------------------------------------------------
// Request validation (every public boundary)
// ---------------------------------------------------------------------------

export const priceRequestSchema = z.object({
  tourId: z.string().cuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(18),
  children: z.number().int().min(0).max(18).default(0),
  infants: z.number().int().min(0).max(6).default(0),
  comfortTier: z.string().trim().min(1).max(40),
  transportStyle: z.string().trim().max(40).optional(),
  addOnSlugs: z.array(z.string().trim().min(1).max(180)).max(12).default([]),
  accommodationPerNightCents: z.number().int().min(0).optional(),
  rooms: z.number().int().min(1).max(20).optional(),
  promoCode: z.string().trim().max(40).optional(),
  manualDiscountCents: z.number().int().min(0).optional(),
  manualDiscountBps: z.number().int().min(1).max(10_000).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).default("USD"),
  customerName: z.string().trim().max(120).optional(),
  customerEmail: z.string().trim().email().max(254).optional(),
  notes: z.string().trim().max(2000).optional(),
  validDays: z.number().int().min(1).max(90).default(14),
});

export type PriceRequest = z.infer<typeof priceRequestSchema>;

export interface PricedLine {
  kind: string;
  label: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
  metadata?: Record<string, unknown>;
}

export interface PriceBreakdown {
  lines: PricedLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  depositCents: number;
  hasPlaceholderRates: boolean;
  seasonSlug: string | null;
  multiplierBps: number;
}

function tripDays(startDate: string, endDate: string): number {
  const diff =
    Math.round(
      (new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) /
        86_400_000,
    ) + 1;
  if (!Number.isFinite(diff) || diff < 1) throw new PricingError("End date must follow the start date");
  if (diff > 60) throw new PricingError("Trips over 60 days are quoted manually");
  return diff;
}

function overlapsSeason(startDate: string, endDate: string, startsOn: string | null, endsOn: string | null): boolean {
  if (!startsOn || !endsOn) return false;
  const start = startDate.slice(5);
  const end = endDate.slice(5);
  const inRange = (key: string) =>
    startsOn <= endsOn ? key >= startsOn && key <= endsOn : key >= startsOn || key <= endsOn;
  return inRange(start) || inRange(end) || (start <= startsOn && end >= endsOn);
}

async function rateToBase(currency: string): Promise<{ rate: number; asOf: string }> {
  if (currency === BASE_CURRENCY) return { rate: 1, asOf: new Date().toISOString() };
  const record = await prisma.currencyRate.findUnique({ where: { currency } });
  if (!record) throw new PricingError(`No currency rate configured for ${currency}`);
  return { rate: Number(record.rateToBase), asOf: record.asOf.toISOString() };
}

function convertFrom(amountCents: number, fromRate: number, toRate: number): number {
  return convertCents(amountCents, fromRate, toRate);
}

/** Pure computation over loaded records — unit-testable without a database. */
export function computeLines(args: {
  days: number;
  adults: number;
  children: number;
  rateCents: number;
  ratePlaceholder: boolean;
  rateLabel: string;
  multiplierBps: number;
  seasonSlug: string | null;
  accommodationPerNightCents?: number;
  rooms?: number;
  parkFees: { label: string; amountCents: number }[];
  transportFees: { label: string; amountCents: number; perPerson: boolean }[];
  transferFees: { label: string; amountCents: number }[];
  addOns: { label: string; amountCents: number | null }[];
  promoDiscountCents: number;
  manualDiscountCents: number;
  manualDiscountBps?: number;
}): PriceBreakdown {
  const {
    days,
    adults,
    children,
    rateCents,
    multiplierBps,
    parkFees,
    transportFees,
    transferFees,
    addOns,
  } = args;
  const persons = adults + children;
  const lines: PricedLine[] = [];

  const adultBase = rateCents * days * adults;
  lines.push({
    kind: "base",
    label: `${args.rateLabel} × ${days}d × ${adults} adult${adults === 1 ? "" : "s"}`,
    quantity: days * adults,
    unitCents: rateCents,
    totalCents: adultBase,
  });
  if (children > 0) {
    const childUnit = applyBps(rateCents, CHILD_RATE_BPS);
    lines.push({
      kind: "base_child",
      label: `Child rate (50%) × ${days}d × ${children}`,
      quantity: days * children,
      unitCents: childUnit,
      totalCents: childUnit * days * children,
    });
  }
  if (multiplierBps !== 10_000) {
    const baseTotal = lines.reduce((sum, line) => sum + line.totalCents, 0);
    const uplift = applyBps(baseTotal, multiplierBps) - baseTotal;
    lines.push({
      kind: "season",
      label: `Seasonal adjustment${args.seasonSlug ? ` (${args.seasonSlug})` : ""}`,
      quantity: 1,
      unitCents: uplift,
      totalCents: uplift,
      metadata: { multiplierBps },
    });
  }

  if (args.accommodationPerNightCents !== undefined) {
    const nights = Math.max(0, days - 1);
    const rooms = args.rooms ?? Math.max(1, Math.ceil(adults / 2));
    lines.push({
      kind: "accommodation",
      label: `Accommodation × ${nights} night${nights === 1 ? "" : "s"} × ${rooms} room${rooms === 1 ? "" : "s"}`,
      quantity: nights * rooms,
      unitCents: args.accommodationPerNightCents,
      totalCents: args.accommodationPerNightCents * nights * rooms,
    });
  }

  for (const fee of parkFees) {
    lines.push({
      kind: "park_fee",
      label: `${fee.label} × ${days}d × ${persons}`,
      quantity: days * persons,
      unitCents: fee.amountCents,
      totalCents: fee.amountCents * days * persons,
    });
  }
  for (const fee of transportFees) {
    const total = fee.perPerson ? fee.amountCents * days * persons : fee.amountCents * days;
    lines.push({
      kind: "transport",
      label: `${fee.label} × ${days}d${fee.perPerson ? ` × ${persons}` : " (group)"}`,
      quantity: fee.perPerson ? days * persons : days,
      unitCents: fee.amountCents,
      totalCents: total,
    });
  }
  for (const fee of transferFees) {
    lines.push({
      kind: "transfer",
      label: `${fee.label} × 2 (arrival + departure)`,
      quantity: 2,
      unitCents: fee.amountCents,
      totalCents: fee.amountCents * 2,
    });
  }
  for (const addOn of addOns) {
    if (addOn.amountCents === null) {
      lines.push({
        kind: "addon",
        label: `${addOn.label} — priced on request`,
        quantity: 0,
        unitCents: 0,
        totalCents: 0,
      });
    } else {
      lines.push({
        kind: "addon",
        label: `${addOn.label} × ${persons}`,
        quantity: persons,
        unitCents: addOn.amountCents,
        totalCents: addOn.amountCents * persons,
      });
    }
  }

  const subtotal = lines.reduce((sum, line) => sum + line.totalCents, 0);
  let discount = args.promoDiscountCents + args.manualDiscountCents;
  if (args.manualDiscountBps !== undefined) {
    discount += applyBps(subtotal, args.manualDiscountBps);
  }
  discount = Math.min(discount, subtotal);
  const total = subtotal - discount;

  return {
    lines,
    subtotalCents: subtotal,
    discountCents: discount,
    totalCents: total,
    depositCents: applyBps(total, DEPOSIT_BPS),
    hasPlaceholderRates: args.ratePlaceholder,
    seasonSlug: args.seasonSlug,
    multiplierBps: args.multiplierBps,
  };
}

async function resolvePromo(code: string | undefined, subtotalHint: number, currency: string) {
  if (!code) return { discountCents: 0, promoId: null as string | null };
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
  const now = new Date();
  if (!promo || !promo.active) throw new PricingError("Promo code is not valid");
  if (promo.validFrom && promo.validFrom > now) throw new PricingError("Promo code is not active yet");
  if (promo.validUntil && promo.validUntil < now) throw new PricingError("Promo code has expired");
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    throw new PricingError("Promo code has reached its usage limit");
  }
  let discount = 0;
  if (promo.percentBps !== null) discount = applyBps(subtotalHint, promo.percentBps);
  else if (promo.amountCents !== null) {
    const { rate: fromRate } = await rateToBase(promo.currency);
    const { rate: toRate } = await rateToBase(currency);
    discount = convertFrom(promo.amountCents, fromRate, toRate);
  }
  return { discountCents: discount, promoId: promo.id };
}

function quoteNumber(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `Q-${new Date().getFullYear()}-${suffix}`;
}

export async function createQuote(actor: Actor | null, input: unknown) {
  gateWrite(actor);
  const data = priceRequestSchema.parse(input);
  const days = tripDays(data.startDate, data.endDate);
  const currency = data.currency;

  const tour = data.tourId
    ? await prisma.tourProduct.findUnique({
        where: { id: data.tourId },
        include: { destinations: { select: { id: true } }, category: true },
      })
    : null;
  if (data.tourId && !tour) throw new NotFoundError("Tour");

  // Base rate: exact (comfort + transport) → comfort-only → fail loudly.
  const rateCard =
    (data.transportStyle &&
      (await prisma.rateCard.findUnique({
        where: {
          comfortTier_transportStyle: { comfortTier: data.comfortTier, transportStyle: data.transportStyle },
        },
      }))) ||
    (await prisma.rateCard.findFirst({ where: { comfortTier: data.comfortTier, transportStyle: null } }));
  if (!rateCard) {
    throw new PricingError(`No base rate configured for comfort tier "${data.comfortTier}"`);
  }

  const { rate: cardRate } = await rateToBase(rateCard.currency);
  const { rate: quoteRate, asOf: quoteRateAsOf } = await rateToBase(currency);
  const rateCents = convertFrom(rateCard.amountCents, cardRate, quoteRate);

  // Season: highest multiplier overlapping the trip wins.
  const seasons = await prisma.season.findMany();
  let seasonSlug: string | null = null;
  let multiplierBps = 10_000;
  for (const season of seasons) {
    if (overlapsSeason(data.startDate, data.endDate, season.startsOn, season.endsOn) && season.multiplierBps > multiplierBps) {
      multiplierBps = season.multiplierBps;
      seasonSlug = season.slug;
    }
  }

  const destinationIds = tour ? tour.destinations.map((d) => d.id) : [];
  const components = await prisma.priceComponent.findMany({
    where: { OR: [{ destinationId: null }, { destinationId: { in: destinationIds } }] },
  });
  async function toQuoteCurrency(amountCents: number, fromCurrency: string): Promise<number> {
    const { rate: fromRate } = await rateToBase(fromCurrency);
    return convertFrom(amountCents, fromRate, quoteRate);
  }
  const parkFees = await Promise.all(
    components
      .filter((c) => c.kind === "park_fee" && c.destinationId)
      .map(async (c) => ({ label: c.name, amountCents: await toQuoteCurrency(c.amountCents, c.currency) })),
  );
  const transportFees = await Promise.all(
    components
      .filter((c) => c.kind === "transport")
      .map(async (c) => ({
        label: c.name,
        amountCents: await toQuoteCurrency(c.amountCents, c.currency),
        perPerson: c.perPerson,
      })),
  );
  const transferFees = await Promise.all(
    components
      .filter((c) => c.kind === "transfer")
      .map(async (c) => ({ label: c.name, amountCents: await toQuoteCurrency(c.amountCents, c.currency) })),
  );

  const addOns = await Promise.all(
    data.addOnSlugs.map(async (slug) => {
      const addOn = await prisma.tourAddOn.findUnique({ where: { slug } });
      if (!addOn) throw new NotFoundError(`Add-on ${slug}`);
      return {
        label: addOn.name,
        amountCents:
          addOn.priceCents === null ? null : await toQuoteCurrency(addOn.priceCents, addOn.currency),
      };
    }),
  );

  const accommodationPerNightCents =
    data.accommodationPerNightCents !== undefined
      ? await toQuoteCurrency(data.accommodationPerNightCents, BASE_CURRENCY)
      : undefined;

  // Manual lines first for promo base, then promo on the subtotal.
  const prePromo = computeLines({
    days,
    adults: data.adults,
    children: data.children,
    rateCents,
    ratePlaceholder: rateCard.placeholder,
    rateLabel: rateCard.name,
    multiplierBps,
    seasonSlug,
    accommodationPerNightCents,
    rooms: data.rooms,
    parkFees,
    transportFees,
    transferFees,
    addOns,
    promoDiscountCents: 0,
    manualDiscountCents: data.manualDiscountCents ?? 0,
    manualDiscountBps: data.manualDiscountBps,
  });
  const { discountCents: promoDiscount, promoId } = await resolvePromo(
    data.promoCode,
    prePromo.subtotalCents,
    currency,
  );
  const breakdown = computeLines({
    days,
    adults: data.adults,
    children: data.children,
    rateCents,
    ratePlaceholder: rateCard.placeholder,
    rateLabel: rateCard.name,
    multiplierBps,
    seasonSlug,
    accommodationPerNightCents,
    rooms: data.rooms,
    parkFees,
    transportFees,
    transferFees,
    addOns,
    promoDiscountCents: promoDiscount,
    manualDiscountCents: data.manualDiscountCents ?? 0,
    manualDiscountBps: data.manualDiscountBps,
  });

  const snapshot = {
    engineVersion: ENGINE_VERSION,
    inputs: { ...data },
    resolved: {
      days,
      seasonSlug,
      multiplierBps,
      rateCard: {
        id: rateCard.id,
        slug: rateCard.slug,
        name: rateCard.name,
        amountCents: rateCard.amountCents,
        currency: rateCard.currency,
        placeholder: rateCard.placeholder,
      },
      currencyRates: { base: BASE_CURRENCY, quoteCurrency: currency, quoteRate, quoteRateAsOf },
      promoId,
    },
    lines: breakdown.lines,
    totals: {
      subtotalCents: breakdown.subtotalCents,
      discountCents: breakdown.discountCents,
      totalCents: breakdown.totalCents,
      depositCents: breakdown.depositCents,
    },
  };

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + data.validDays);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const quote = await prisma.$transaction(async (tx) => {
        const created = await tx.quote.create({
          data: {
            number: quoteNumber(),
            tourId: data.tourId ?? null,
            customerName: data.customerName ?? null,
            customerEmail: data.customerEmail ?? null,
            currency,
            status: "DRAFT",
            validUntil,
            subtotalCents: breakdown.subtotalCents,
            discountCents: breakdown.discountCents,
            totalCents: breakdown.totalCents,
            depositCents: breakdown.depositCents,
            hasPlaceholderRates: breakdown.hasPlaceholderRates,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            notes: data.notes ?? null,
            createdById: actor?.id ?? null,
            items: {
              create: breakdown.lines.map((line) => ({
                kind: line.kind,
                label: line.label,
                quantity: line.quantity,
                unitCents: line.unitCents,
                totalCents: line.totalCents,
                metadata: (line.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
              })),
            },
          },
          include: { items: true, tour: { select: { slug: true, title: true } } },
        });
        if (promoId) {
          await tx.promoCode.update({ where: { id: promoId }, data: { usedCount: { increment: 1 } } });
        }
        return created;
      });
      return quote;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new ConflictError("Could not generate a unique quote number");
}

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT", "EXPIRED"],
  SENT: ["DRAFT", "ACCEPTED", "EXPIRED"],
  ACCEPTED: ["CONVERTED"],
  EXPIRED: [],
  CONVERTED: [],
};

export async function setQuoteStatus(actor: Actor | null, id: string, status: QuoteStatus) {
  gateWrite(actor);
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) throw new NotFoundError("Quote");
  if (!TRANSITIONS[quote.status].includes(status)) {
    throw new PricingError(`Cannot move quote from ${quote.status} to ${status}`);
  }
  return prisma.quote.update({ where: { id }, data: { status } });
}

export async function getQuote(actor: Actor | null, id: string) {
  gateWrite(actor);
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { items: true, tour: { select: { slug: true, title: true } } },
  });
  if (!quote) throw new NotFoundError("Quote");
  return quote;
}

export async function listQuotes(actor: Actor | null, status?: QuoteStatus) {
  gateWrite(actor);
  return prisma.quote.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { tour: { select: { slug: true, title: true } } },
  });
}

/** Expire all due draft/sent quotes. Returns the count expired. */
export async function expireQuotes(now: Date = new Date()): Promise<number> {
  const result = await prisma.quote.updateMany({
    where: { status: { in: ["DRAFT", "SENT"] }, validUntil: { lt: now } },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
