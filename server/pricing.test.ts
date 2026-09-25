import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import {
  computeLines,
  createQuote,
  expireQuotes,
  getQuote,
  listQuotes,
  setQuoteStatus,
} from "@/server/pricing";
import { createCategory, createDestination, createTour, deleteTour, NotFoundError } from "@/server/catalogue";
import { testActor, unique } from "@/tests/db";

const admin = testActor("ADMIN");
const consultant = testActor("SAFARI_CONSULTANT");

describe("computeLines (pure money math)", () => {
  const base = {
    days: 7,
    adults: 2,
    children: 0,
    rateCents: 40_000,
    ratePlaceholder: false,
    rateLabel: "Mid-range",
    multiplierBps: 10_000,
    seasonSlug: null,
    parkFees: [],
    transportFees: [],
    transferFees: [],
    addOns: [],
    promoDiscountCents: 0,
    manualDiscountCents: 0,
  };

  it("prices two adults exactly", () => {
    const result = computeLines({ ...base });
    expect(result.subtotalCents).toBe(40_000 * 7 * 2);
    expect(result.totalCents).toBe(result.subtotalCents);
    expect(result.depositCents).toBe(Math.round(result.subtotalCents * 0.3));
    expect(result.lines[0]).toMatchObject({ kind: "base", quantity: 14, unitCents: 40_000 });
  });

  it("charges children at 50% and ignores infants by construction", () => {
    const result = computeLines({ ...base, children: 2 });
    const childLine = result.lines.find((l) => l.kind === "base_child");
    expect(childLine?.unitCents).toBe(20_000);
    expect(childLine?.totalCents).toBe(20_000 * 7 * 2);
  });

  it("applies seasonal uplift to the base only", () => {
    const result = computeLines({
      ...base,
      multiplierBps: 11_500,
      seasonSlug: "migration-season",
      parkFees: [{ label: "Fee", amountCents: 8000 }],
    });
    const season = result.lines.find((l) => l.kind === "season");
    expect(season?.totalCents).toBe(560_000 * 0.15);
    // Park fees are not uplifted: 8000 * 7 * 2.
    expect(result.subtotalCents).toBe(560_000 + 84_000 + 112_000);
  });

  it("caps discounts at the subtotal", () => {
    const result = computeLines({
      ...base,
      manualDiscountCents: 999_999_999,
      manualDiscountBps: 10_000,
    });
    expect(result.discountCents).toBe(result.subtotalCents);
    expect(result.totalCents).toBe(0);
    expect(result.depositCents).toBe(0);
  });

  it("prices group transport per day and transfers × 2", () => {
    const result = computeLines({
      ...base,
      transportFees: [{ label: "Cruiser", amountCents: 30_000, perPerson: false }],
      transferFees: [{ label: "Transfer", amountCents: 5000 }],
    });
    expect(result.subtotalCents).toBe(560_000 + 210_000 + 10_000);
  });

  it("lists unpriced add-ons as zero lines", () => {
    const result = computeLines({
      ...base,
      addOns: [
        { label: "Balloon", amountCents: 59_000 },
        { label: "Mystery", amountCents: null },
      ],
    });
    expect(result.subtotalCents).toBe(560_000 + 59_000 * 2 + 0);
  });
});

describe("createQuote (engine + persistence)", () => {
  let categoryId = "";
  let destinationId = "";
  let tourId = "";

  beforeAll(async () => {
    const category = await createCategory(admin, { name: unique("Price Cat") });
    categoryId = category.id;
    const destination = await createDestination(admin, {
      name: unique("Price Park"),
      slug: unique("price-park"),
      country: "Kenya",
      excerpt: "A park used only by pricing tests.",
    });
    destinationId = destination.id;
    await prisma.rateCard.create({
      data: {
        slug: unique("test-tier"),
        name: "Test tier",
        comfortTier: unique("test-tier"),
        transportStyle: null,
        amountCents: 10_000,
        currency: "USD",
        placeholder: false,
      },
    });
    await prisma.priceComponent.create({
      data: {
        slug: unique("test-fee"),
        name: "Test park fee",
        kind: "park_fee",
        amountCents: 1000,
        currency: "USD",
        perPerson: true,
        destinationId,
      },
    });
    const tour = await createTour(admin, {
      title: unique("Priced Safari"),
      categoryId,
      destinationIds: [destinationId],
      durationDays: 3,
      excerpt: "A safari used only by pricing tests.",
    });
    tourId = tour.id;
    // Hermetic season: August trips resolve the migration multiplier.
    await prisma.season.create({
      data: {
        slug: unique("test-migration"),
        name: "Test migration season",
        startsOn: "07-01",
        endsOn: "10-31",
        multiplierBps: 11_500,
      },
    });
  });

  async function baseRequest(overrides: Record<string, unknown> = {}) {
    const tier = await prisma.rateCard.findFirstOrThrow({
      where: { comfortTier: { startsWith: "test-tier" } },
    });
    return {
      tourId,
      startDate: "2027-08-10",
      endDate: "2027-08-12",
      adults: 2,
      children: 0,
      infants: 0,
      comfortTier: tier.comfortTier,
      ...overrides,
    };
  }

  it("builds an exact quote for two adults in migration season", async () => {
    // August falls in the seeded migration season (11500 bps).
    const quote = await createQuote(admin, await baseRequest());
    // Base 10000 × 3d × 2 = 60000; uplift 9000; fee 1000 × 3 × 2 = 6000.
    // (The isolated test database holds no other components.)
    const lines = quote.items;
    expect(lines.find((l) => l.kind === "base")?.totalCents).toBe(60_000);
    expect(lines.find((l) => l.kind === "season")?.totalCents).toBe(9_000);
    expect(lines.find((l) => l.kind === "park_fee")?.totalCents).toBe(6_000);
    expect(quote.subtotalCents).toBe(lines.reduce((s, l) => s + l.totalCents, 0));
    expect(quote.totalCents).toBe(quote.subtotalCents);
    expect(quote.depositCents).toBe(Math.round(quote.totalCents * 0.3));
    expect(quote.number).toMatch(/^Q-\d{4}-[A-Z2-9]{6}$/);
    expect(quote.hasPlaceholderRates).toBe(false);
    expect(quote.status).toBe("DRAFT");
  });

  it("keeps totals internally consistent for families and groups", async () => {
    const family = await createQuote(admin, await baseRequest({ adults: 2, children: 2 }));
    expect(family.subtotalCents).toBe(family.items.reduce((s, l) => s + l.totalCents, 0));
    expect(family.items.find((l) => l.kind === "base_child")?.totalCents).toBe(5000 * 3 * 2);
    const group = await createQuote(admin, await baseRequest({ adults: 10 }));
    expect(group.items.find((l) => l.kind === "base")?.totalCents).toBe(10_000 * 3 * 10);
  });

  it("freezes history: later rate changes do not move old quotes", async () => {
    const quote = await createQuote(admin, await baseRequest());
    const before = quote.totalCents;
    const tier = await prisma.rateCard.findFirstOrThrow({
      where: { comfortTier: { startsWith: "test-tier" } },
    });
    await prisma.rateCard.update({ where: { id: tier.id }, data: { amountCents: 99_999 } });
    const reread = await getQuote(admin, quote.id);
    expect(reread.totalCents).toBe(before);
    expect(reread.snapshot).toMatchObject({ engineVersion: "1" });
    await prisma.rateCard.update({ where: { id: tier.id }, data: { amountCents: 10_000 } });
  });

  it("applies promo codes and rejects spent ones", async () => {
    const code = unique("TESTPROMO").slice(0, 20).toUpperCase();
    await prisma.promoCode.create({
      data: { code, kind: "discount", percentBps: 1000, currency: "USD", maxUses: 1, active: true },
    });
    const discounted = await createQuote(admin, await baseRequest({ promoCode: code }));
    expect(discounted.discountCents).toBe(Math.round(discounted.subtotalCents * 0.1));
    expect(discounted.totalCents).toBe(discounted.subtotalCents - discounted.discountCents);
    await expect(createQuote(admin, await baseRequest({ promoCode: code }))).rejects.toThrow(
      /usage limit/,
    );
    await prisma.promoCode.delete({ where: { code } });
  });

  it("rejects expired promos and unknown add-ons", async () => {
    const code = unique("OLD").slice(0, 20).toUpperCase();
    await prisma.promoCode.create({
      data: {
        code,
        kind: "discount",
        percentBps: 1000,
        currency: "USD",
        validUntil: new Date("2020-01-01"),
        active: true,
      },
    });
    await expect(createQuote(admin, await baseRequest({ promoCode: code }))).rejects.toThrow(/expired/);
    await prisma.promoCode.delete({ where: { code } });
    await expect(createQuote(admin, await baseRequest({ addOnSlugs: ["no-such-addon"] }))).rejects.toThrow(
      NotFoundError,
    );
  });

  it("converts to KES and EUR, and fails loudly without a rate", async () => {
    await prisma.currencyRate.upsert({
      where: { currency: "KES" },
      update: { rateToBase: 129 },
      create: { currency: "KES", rateToBase: 129 },
    });
    await prisma.currencyRate.upsert({
      where: { currency: "EUR" },
      update: { rateToBase: 0.92 },
      create: { currency: "EUR", rateToBase: 0.92 },
    });
    const usd = await createQuote(admin, await baseRequest());
    const kes = await createQuote(admin, await baseRequest({ currency: "KES" }));
    // Per-line rounding means approximate — within 1% of the rate.
    const ratio = kes.totalCents / usd.totalCents;
    expect(Math.abs(ratio - 129) / 129).toBeLessThan(0.01);
    await expect(createQuote(admin, await baseRequest({ currency: "GBP" }))).rejects.toThrow(
      /No currency rate/,
    );
  });

  it("enforces the status machine and expiry", async () => {
    const quote = await createQuote(admin, await baseRequest());
    await expect(setQuoteStatus(admin, quote.id, "ACCEPTED")).rejects.toThrow(/Cannot move/);
    await setQuoteStatus(admin, quote.id, "SENT");
    await setQuoteStatus(admin, quote.id, "ACCEPTED");
    await setQuoteStatus(admin, quote.id, "CONVERTED");
    await expect(setQuoteStatus(admin, quote.id, "DRAFT")).rejects.toThrow(/Cannot move/);

    const doomed = await createQuote(admin, await baseRequest());
    await prisma.quote.update({
      where: { id: doomed.id },
      data: { validUntil: new Date("2020-01-01") },
    });
    expect(await expireQuotes(new Date("2021-01-01"))).toBeGreaterThanOrEqual(1);
    expect((await getQuote(admin, doomed.id)).status).toBe("EXPIRED");
    expect(await listQuotes(admin, "EXPIRED")).toContainEqual(
      expect.objectContaining({ id: doomed.id }),
    );
  });

  it("requires write permission and real inputs", async () => {
    await expect(createQuote(null, await baseRequest())).rejects.toThrow(UnauthorizedError);
    await expect(createQuote(consultant, await baseRequest())).rejects.toThrow(ForbiddenError);
    await expect(createQuote(admin, { ...(await baseRequest()), comfortTier: "no-such-tier" })).rejects.toThrow(
      /No base rate/,
    );
    await expect(
      createQuote(admin, { ...(await baseRequest()), tourId: "ck00000000000000000000000" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("cleans up fixtures", async () => {
    await deleteTour(admin, tourId);
    await prisma.season.deleteMany({ where: { slug: { startsWith: "test-migration" } } });
    await prisma.priceComponent.deleteMany({ where: { destinationId } });
    await prisma.rateCard.deleteMany({ where: { comfortTier: { startsWith: "test-tier" } } });
    await prisma.destination.delete({ where: { id: destinationId } });
    await prisma.tourCategory.delete({ where: { id: categoryId } });
  });
});
