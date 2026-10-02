import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/permissions";
import {
  addServiceLine,
  bookingPricingSummary,
  convertCost,
  deleteMarkupRule,
  formatPct,
  listMarkupRules,
  listServiceLines,
  marginBps,
  markupAmount,
  markupBps,
  priceBookingLines,
  removeServiceLine,
  resolveMarkup,
  roundToIncrement,
  scaleLineCost,
  setTaxFeeActive,
  upsertMarkupRule,
  upsertTaxFee,
} from "@/server/marketplace-pricing";
import { serviceLineReference } from "@/server/booking-references";
import { createBooking } from "@/server/bookings";
import { createSupplier, createSupplierRate } from "@/server/suppliers";
import { testActor, unique } from "@/tests/db";

const admin = testActor("ADMIN");
const agent = testActor("RESERVATION_STAFF");
const finance = testActor("FINANCE_USER");

async function gatedBooking(currency = "USD") {
  return createBooking(null, {
    customerName: "Pricing Test",
    customerEmail: `${unique("pricing")}@example.com`,
    currency,
    adults: 2,
  });
}

const GLOBAL = { mode: "PERCENT" as const, percentBps: 2500 };

function line(overrides: Record<string, unknown> = {}) {
  return {
    serviceName: "Test service",
    serviceType: "airport-transfer",
    unit: "PER_TRANSFER" as const,
    unitCostCents: 10_000,
    quantity: 1,
    costCurrency: "USD",
    ...overrides,
  };
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    lines: [line()],
    currency: "USD",
    fxRates: {},
    roundingIncrement: 1,
    globalMarkup: GLOBAL,
    ...overrides,
  };
}

describe("pure engine", () => {
  it("prices percentage markups and reports markup vs margin honestly", () => {
    const priced = priceBookingLines(request());
    const [pricedLine] = priced.lines;
    expect(pricedLine?.costCents).toBe(10_000);
    expect(pricedLine?.markupCents).toBe(2_500);
    expect(pricedLine?.clientPriceCents).toBe(12_500);
    expect(pricedLine?.incomeCents).toBe(2_500);
    // 25% markup on cost is a 20% margin on price.
    expect(pricedLine?.markupPctBps).toBe(2500);
    expect(pricedLine?.marginPctBps).toBe(2000);
    expect(formatPct(2500)).toBe("25.00%");
    expect(formatPct(2000)).toBe("20.00%");
    expect(priced.totalCostCents).toBe(10_000);
    expect(priced.totalIncomeCents).toBe(2_500);
    expect(priced.blendedMarginBps).toBe(2000);
    expect(priced.depositCents).toBe(3_750);
  });

  it("prices fixed-amount markups", () => {
    const priced = priceBookingLines(
      request({ globalMarkup: { mode: "FIXED", fixedCents: 3_000 } }),
    );
    expect(priced.lines[0]?.clientPriceCents).toBe(13_000);
    expect(priced.lines[0]?.markup?.source).toBe("GLOBAL");
  });

  it("resolves line > supplier > type > global", () => {
    const rules = {
      line: { mode: "PERCENT" as const, percentBps: 500 },
      supplier: { mode: "PERCENT" as const, percentBps: 1000 },
      serviceType: { mode: "PERCENT" as const, percentBps: 1500 },
      global: GLOBAL,
    };
    expect(resolveMarkup(rules).source).toBe("LINE");
    expect(resolveMarkup({ ...rules, line: undefined }).source).toBe("SUPPLIER");
    expect(resolveMarkup({ ...rules, line: undefined, supplier: null }).source).toBe("SERVICE_TYPE");
    expect(
      resolveMarkup({ global: GLOBAL, supplier: null, serviceType: null }).source,
    ).toBe("GLOBAL");
  });

  it("scales per-person units by pax and ignores pax for vehicles", () => {
    expect(
      scaleLineCost({ unit: "PER_PERSON_PER_NIGHT", unitCostCents: 25_000, quantity: 3, pax: 2 }),
    ).toBe(150_000);
    expect(
      scaleLineCost({ unit: "PER_VEHICLE_PER_DAY", unitCostCents: 28_000, quantity: 2, pax: 7 }),
    ).toBe(56_000);
    expect(scaleLineCost({ unit: "PER_TRANSFER", unitCostCents: 4_000, quantity: 2, pax: 6 })).toBe(8_000);
    expect(scaleLineCost({ unit: "PER_ACTIVITY", unitCostCents: 55_000, quantity: 1, pax: 2 })).toBe(110_000);
  });

  it("rounds client prices to the configured increment", () => {
    expect(roundToIncrement(12_345, 100)).toBe(12_300);
    expect(roundToIncrement(12_350, 100)).toBe(12_400);
    expect(roundToIncrement(12_500, 500)).toBe(12_500);
    expect(roundToIncrement(12_501, 500)).toBe(12_500);
    const priced = priceBookingLines(
      request({ roundingIncrement: 500, globalMarkup: { mode: "PERCENT", percentBps: 2345 } }),
    );
    // 10_000 + 2_345 = 12_345 -> 12_500.
    expect(priced.lines[0]?.clientPriceCents).toBe(12_500);
  });

  it("keeps taxes as separate lines, never inside markup", () => {
    const priced = priceBookingLines(
      request({
        globalMarkup: { mode: "PERCENT", percentBps: 0 },
        taxes: [
          { name: "VAT", mode: "PERCENT", percentBps: 1600 },
          { name: "Tourism levy", mode: "FIXED", fixedCents: 500 },
        ],
      }),
    );
    expect(priced.subtotalCents).toBe(10_000);
    expect(priced.taxLines).toEqual([
      { name: "VAT", amountCents: 1_600 },
      { name: "Tourism levy", amountCents: 500 },
    ]);
    expect(priced.totalClientCents).toBe(12_100);
    expect(priced.lines[0]?.markupCents).toBe(0);
  });

  it("clamps discounts to the subtotal", () => {
    const priced = priceBookingLines(request({ discountCents: 99_999 }));
    // Subtotal is 12_500 (10_000 cost + 25% markup); discount caps there.
    expect(priced.discountCents).toBe(12_500);
    expect(priced.totalClientCents).toBe(0);
  });

  it("converts multi-currency costs at the recorded rate", () => {
    expect(convertCost(12_900, 129, 1)).toBe(100);
    const priced = priceBookingLines(
      request({
        lines: [line({ unitCostCents: 12_900, costCurrency: "KES" })],
        fxRates: { KES: 129 },
      }),
    );
    expect(priced.lines[0]?.costCents).toBe(100);
    expect(priced.lines[0]?.clientPriceCents).toBe(125);
  });

  it("rejects bad inputs loudly", () => {
    expect(() => priceBookingLines(request({ lines: [] }))).toThrow();
    expect(() => priceBookingLines(request({ roundingIncrement: 0 }))).toThrow();
    expect(() => priceBookingLines(request({ lines: [line({ costCurrency: "KES" })] }))).toThrow();
    expect(() => scaleLineCost({ unit: "PER_TRANSFER", unitCostCents: 100, quantity: 0 })).toThrow();
    expect(() => markupAmount(100, { mode: "PERCENT", source: "GLOBAL" })).toThrow();
    expect(() => roundToIncrement(100.5, 1)).toThrow();
    expect(markupBps(0, 500)).toBe(0);
    expect(marginBps(100, 0)).toBe(0);
  });
});

describe("rules and service lines", () => {
  beforeAll(async () => {
    await prisma.markupRule.upsert({
      where: { scope_scopeKey: { scope: "GLOBAL", scopeKey: "" } },
      update: { mode: "PERCENT", percentBps: 2500, fixedCents: null, active: true },
      create: { scope: "GLOBAL", scopeKey: "", mode: "PERCENT", percentBps: 2500, currency: "USD", active: true },
    });
    await prisma.currencyRate.upsert({
      where: { currency: "KES" },
      update: {},
      create: { currency: "KES", rateToBase: 129 },
    });
    await prisma.siteSetting.upsert({
      where: { key: "pricing.roundingIncrementCents" },
      update: { value: "1" },
      create: { key: "pricing.roundingIncrementCents", value: "1" },
    });
    await prisma.supplierType.upsert({
      where: { slug: "airport-transfer" },
      update: { active: true },
      create: { slug: "airport-transfer", name: "Airport pickup / transfer", active: true },
    });
  });

  async function pricedBooking(currency = "USD") {
    return createBooking(null, {
      customerName: "Pricing Test",
      customerEmail: `${unique("pricing")}@example.com`,
      currency,
      adults: 2,
    });
  }

  async function pricedSupplier() {
    const suffix = unique("psup");
    const supplier = await createSupplier(admin, {
      name: `Pricing Supplier ${suffix}`,
      typeSlugs: ["airport-transfer"],
      coverageAreas: ["Nairobi"],
    });
    const rate = await createSupplierRate(admin, supplier.id, {
      serviceName: `Priced transfer ${suffix}`,
      serviceType: "airport-transfer",
      unit: "PER_TRANSFER",
      currency: "USD",
      costCents: 4_000,
      capacity: 10,
    });
    return { supplier, rate };
  }

  it("manages markup rules with scope guards", async () => {
    const supplier = (await pricedSupplier()).supplier;
    const rule = await upsertMarkupRule(admin, {
      scope: "SUPPLIER",
      scopeKey: supplier.id,
      mode: "PERCENT",
      percentBps: 1000,
    });
    expect(rule.scopeKey).toBe(supplier.id);
    await expect(
      upsertMarkupRule(admin, { scope: "SUPPLIER", scopeKey: "no-such-id", mode: "PERCENT", percentBps: 1000 }),
    ).rejects.toThrow();
    await expect(
      upsertMarkupRule(admin, { scope: "SERVICE_TYPE", scopeKey: "no-such-type", mode: "PERCENT", percentBps: 1000 }),
    ).rejects.toThrow();
    await expect(
      upsertMarkupRule(admin, { scope: "GLOBAL", mode: "PERCENT" }),
    ).rejects.toThrow();
    await deleteMarkupRule(admin, rule.id);
  });

  it("protects the global default from deletion", async () => {
    const global = await prisma.markupRule.findFirstOrThrow({ where: { scope: "GLOBAL" } });
    await expect(deleteMarkupRule(admin, global.id)).rejects.toThrow();
  });

  it("costs a rate-backed line against the global rule", async () => {
    const booking = await pricedBooking();
    const { supplier, rate } = await pricedSupplier();
    const created = await addServiceLine(admin, booking.id, {
      serviceName: "JKIA pickup",
      serviceType: "airport-transfer",
      supplierId: supplier.id,
      rateId: rate.id,
      unit: "PER_TRANSFER",
      quantity: 2,
    });
    expect(created.seq).toBe(1);
    expect(created.costCents).toBe(8_000);
    expect(created.markupSource).toBe("GLOBAL");
    expect(created.markupBps).toBe(2500);
    expect(created.clientPriceCents).toBe(10_000);
    expect(created.incomeCents).toBe(2_000);
    expect(serviceLineReference(booking.reference, created.seq)).toBe(`${booking.reference}-S1`);
    const second = await addServiceLine(admin, booking.id, {
      serviceName: "Extra transfer",
      serviceType: "airport-transfer",
      costCents: 5_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    expect(second.seq).toBe(2);
  });

  it("prefers line overrides, then supplier rules", async () => {
    const booking = await pricedBooking();
    const { supplier, rate } = await pricedSupplier();
    await upsertMarkupRule(admin, {
      scope: "SUPPLIER",
      scopeKey: supplier.id,
      mode: "PERCENT",
      percentBps: 1000,
    });
    const viaSupplier = await addServiceLine(admin, booking.id, {
      serviceName: "Supplier rule line",
      serviceType: "airport-transfer",
      supplierId: supplier.id,
      rateId: rate.id,
      unit: "PER_TRANSFER",
    });
    expect(viaSupplier.markupSource).toBe("SUPPLIER");
    expect(viaSupplier.clientPriceCents).toBe(4_400);
    const viaOverride = await addServiceLine(admin, booking.id, {
      serviceName: "Override line",
      serviceType: "airport-transfer",
      supplierId: supplier.id,
      rateId: rate.id,
      unit: "PER_TRANSFER",
      lineMarkupBps: 500,
    });
    expect(viaOverride.markupSource).toBe("LINE");
    expect(viaOverride.clientPriceCents).toBe(4_200);
  });

  it("supports fixed-amount rules and custom costs", async () => {
    const booking = await pricedBooking();
    const { supplier } = await pricedSupplier();
    await upsertMarkupRule(admin, {
      scope: "SUPPLIER",
      scopeKey: supplier.id,
      mode: "FIXED",
      fixedCents: 5_000,
      currency: "USD",
    });
    const fixed = await addServiceLine(admin, booking.id, {
      serviceName: "Fixed markup line",
      serviceType: "airport-transfer",
      supplierId: supplier.id,
      costCents: 20_000,
      currency: "USD",
      unit: "PER_GROUP",
    });
    expect(fixed.markupSource).toBe("SUPPLIER");
    expect(fixed.clientPriceCents).toBe(25_000);
    expect(fixed.incomeCents).toBe(5_000);
  });

  it("prices KES supplier costs into USD bookings", async () => {
    const booking = await pricedBooking("USD");
    const { supplier, rate } = await pricedSupplier();
    await prisma.supplierRate.update({ where: { id: rate.id }, data: { currency: "KES", costCents: 12_900 } });
    const created = await addServiceLine(admin, booking.id, {
      serviceName: "KES transfer",
      serviceType: "airport-transfer",
      supplierId: supplier.id,
      rateId: rate.id,
      unit: "PER_TRANSFER",
    });
    expect(created.currency).toBe("USD");
    expect(created.costCents).toBe(100);
    expect(Number(created.fxRate)).toBe(1);
  });

  it("manages taxes as separate active lines", async () => {    const booking = await pricedBooking();
    await addServiceLine(admin, booking.id, {
      serviceName: "Taxed line",
      serviceType: "airport-transfer",
      costCents: 8_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    const tax = await upsertTaxFee(admin, null, {
      name: `Test levy ${unique("tax")}`,
      mode: "PERCENT",
      percentBps: 1000,
      currency: "USD",
    });
    const withTax = await bookingPricingSummary(admin, booking.id);
    expect(withTax.totalClientCents).toBe(11_000);
    expect(withTax.taxTotalCents).toBe(1_000);
    await setTaxFeeActive(admin, tax.id, false);
    const withoutTax = await bookingPricingSummary(admin, booking.id);
    expect(withoutTax.totalClientCents).toBe(10_000);
    expect(withoutTax.taxTotalCents).toBe(0);
  });

  it("summarises booking totals with blended margin", async () => {
    const booking = await pricedBooking();
    await addServiceLine(admin, booking.id, {
      serviceName: "Line one",
      serviceType: "airport-transfer",
      costCents: 8_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    await addServiceLine(admin, booking.id, {
      serviceName: "Line two",
      serviceType: "airport-transfer",
      costCents: 8_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    const summary = await bookingPricingSummary(admin, booking.id);
    expect(summary.totalCostCents).toBe(16_000);
    expect(summary.totalClientCents).toBe(20_000);
    expect(summary.totalIncomeCents).toBe(4_000);
    expect(summary.blendedMarginBps).toBe(2000);
    expect(summary.lines).toHaveLength(2);
    // No cost fields on the booking row itself — nothing to leak.
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(row).not.toHaveProperty("costCents");
    // Stored lines are admin shape: full money trail per line.
    const listed = await listServiceLines(admin, booking.id);
    expect(listed[0]).toMatchObject({ seq: 1, costCents: 8_000, clientPriceCents: 10_000 });
    await removeServiceLine(admin, listed[1]?.id as string);
    expect(await listServiceLines(admin, booking.id)).toHaveLength(1);
  });
});

describe("finance gating", () => {
  it("redacts cost, income and margin for booking agents", async () => {
    const booking = await gatedBooking();
    await addServiceLine(admin, booking.id, {
      serviceName: "Gated line",
      serviceType: "airport-transfer",
      costCents: 8_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    // Agents can still operate lines and see client prices.
    const summary = await bookingPricingSummary(agent, booking.id);
    expect(summary.lines[0]?.clientPriceCents).toBe(10_000);
    expect(summary.lines[0]?.costCents).toBeNull();
    expect(summary.lines[0]).toMatchObject({ redacted: true });
    expect(summary.totalClientCents).toBe(10_000);
    expect(summary.totalCostCents).toBeNull();
    expect(summary.totalIncomeCents).toBeNull();
    expect(summary.blendedMarginBps).toBeNull();
    const listed = await listServiceLines(agent, booking.id);
    expect(listed[0]?.costCents).toBeNull();
    expect(listed[0]?.incomeCents).toBeNull();
    // Finance sees the full trail.
    const full = await bookingPricingSummary(admin, booking.id);
    expect(full.totalCostCents).toBe(8_000);
    expect(full.totalIncomeCents).toBe(2_000);
  });

  it("restricts markup rules to finance roles", async () => {
    await expect(listMarkupRules(agent)).rejects.toThrow(ForbiddenError);
    await expect(listMarkupRules(finance)).resolves.toBeDefined();
  });
});
