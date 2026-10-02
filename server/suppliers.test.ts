import { randomBytes } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError } from "@/lib/permissions";
import {
  decryptSecret,
  encryptSecret,
  supplierPiiKey,
} from "@/lib/supplier-secrets";
import {
  SupplierError,
  addSupplierDocument,
  consumeSupplierToken,
  createSupplier,
  createSupplierLock,
  createSupplierRate,
  createSupplierType,
  listSupplierPayouts,
  listSupplierRates,
  listSuppliers,
  marketplaceCalendar,
  mintSupplierResponseToken,
  recordSupplierPayout,
  revealSupplierPayout,
  setSupplierLockStatus,
  setSupplierPayoutStatus,
  suggestSuppliers,
  updateSupplier,
  updateSupplierRate,
  verifySupplierToken,
} from "@/server/suppliers";
import { ConflictError, NotFoundError } from "@/server/catalogue";
import { testActor, unique } from "@/tests/db";

// Deterministic test key — never a real secret. Module scope runs before
// any encryption call in this file.
process.env.SUPPLIER_PII_KEY = "a".repeat(64);

const admin = testActor("ADMIN");
const finance = testActor("FINANCE_USER");
const agent = testActor("RESERVATION_STAFF");

const TYPE = "airport-transfer";

async function demoSupplier(overrides: Record<string, unknown> = {}) {
  const suffix = unique("sup");
  return createSupplier(admin, {
    name: `Demo Supplier ${suffix}`,
    typeSlugs: [TYPE],
    contactPerson: "Demo Contact",
    phone: "+254700000000",
    email: `${suffix}@example.com`,
    coverageAreas: ["Nairobi"],
    rating: 4,
    ...overrides,
  });
}

async function demoRate(supplierId: string, overrides: Record<string, unknown> = {}) {
  return createSupplierRate(admin, supplierId, {
    serviceName: `Test transfer ${unique("rate")}`,
    serviceType: TYPE,
    unit: "PER_TRANSFER",
    currency: "USD",
    costCents: 5000,
    capacity: 2,
    ...overrides,
  });
}

describe("payout encryption", () => {
  it("round-trips with the configured key", () => {
    const cipher = encryptSecret("M-Pesa till 123456", supplierPiiKey());
    expect(cipher).not.toContain("123456");
    expect(decryptSecret(cipher, supplierPiiKey())).toBe("M-Pesa till 123456");
  });

  it("rejects wrong keys and tampered payloads", () => {
    const cipher = encryptSecret("secret", supplierPiiKey());
    const wrong = Buffer.from("b".repeat(64), "hex");
    expect(() => decryptSecret(cipher, wrong)).toThrow();
    // Flip a byte inside the ciphertext segment (last :-separated part).
    const tampered = cipher.slice(0, -8) + (cipher.endsWith("A") ? "B" : "A") + cipher.slice(-7);
    expect(tampered).not.toBe(cipher);
    expect(() => decryptSecret(tampered)).toThrow();
    expect(() => decryptSecret("garbage")).toThrow();
  });

  it("requires a valid key", () => {
    const saved = process.env.SUPPLIER_PII_KEY;
    process.env.SUPPLIER_PII_KEY = "";
    expect(() => supplierPiiKey()).toThrow();
    process.env.SUPPLIER_PII_KEY = "short";
    expect(() => supplierPiiKey()).toThrow();
    process.env.SUPPLIER_PII_KEY = saved;
  });
});

describe("supplier types", () => {
  it("creates types and rejects duplicates", async () => {
    const slug = unique("type");
    const type = await createSupplierType(admin, { name: `Test Type ${slug}` });
    expect(type.slug).toMatch(/test-type-/);
    await expect(createSupplierType(admin, { name: `Test Type ${slug}` })).rejects.toThrow(ConflictError);
  });
});

describe("supplier registry", () => {
  it("stores payout details encrypted and never returns them", async () => {
    const supplier = await demoSupplier({
      payoutDetails: "M-Pesa till 999999",
      payoutHint: "M-Pesa •••• 9999",
    });
    expect(supplier).not.toHaveProperty("payoutCiphertext");
    expect(supplier.payoutHint).toBe("M-Pesa •••• 9999");
    const row = await prisma.supplier.findUniqueOrThrow({ where: { id: supplier.id } });
    expect(row.payoutCiphertext).toBeTruthy();
    expect(row.payoutCiphertext).not.toContain("999999");
  });

  it("reveals payouts to finance only, with an audit trail", async () => {
    const supplier = await demoSupplier({ payoutDetails: "Bank acct 112233" });
    const revealed = await revealSupplierPayout(finance, supplier.id);
    expect(revealed.payoutDetails).toBe("Bank acct 112233");
    await expect(revealSupplierPayout(agent, supplier.id)).rejects.toThrow(ForbiddenError);
    const audit = await prisma.auditLog.findMany({
      where: { action: "supplier.payout.revealed", resourceId: supplier.id },
    });
    expect(audit.length).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(audit)).not.toContain("112233");
  });

  it("searches by name, area and email, and filters by status", async () => {
    const suffix = unique("findme");
    await demoSupplier({ name: `Findme ${suffix} Transfers`, coverageAreas: ["Mara"] });
    const byName = await listSuppliers(admin, { search: suffix.toLowerCase() });
    expect(byName.some((s) => s.name.includes(suffix))).toBe(true);
    const byArea = await listSuppliers(admin, { search: "Mara" });
    expect(byArea.some((s) => s.name.includes(suffix))).toBe(true);
    const paused = await demoSupplier({ status: "PAUSED" });
    const active = await listSuppliers(admin, { status: "ACTIVE" });
    expect(active.some((s) => s.id === paused.id)).toBe(false);
  });

  it("updates details and rotates payout secrets", async () => {
    const supplier = await demoSupplier({ payoutDetails: "old secret" });
    const updated = await updateSupplier(admin, supplier.id, {
      rating: 5,
      status: "PAUSED",
      payoutDetails: "new secret",
    });
    expect(updated.rating).toBe(5);
    expect(updated.status).toBe("PAUSED");
    const revealed = await revealSupplierPayout(finance, supplier.id);
    expect(revealed.payoutDetails).toBe("new secret");
  });

  it("rejects unknown types", async () => {
    await expect(demoSupplier({ typeSlugs: ["no-such-type"] })).rejects.toThrow(SupplierError);
  });

  it("stores licence/insurance documents", async () => {
    const supplier = await demoSupplier();
    const doc = await addSupplierDocument(admin, supplier.id, {
      kind: "license",
      title: "Tourism licence 2026",
      url: "https://example.com/licence.pdf",
    });
    expect(doc.supplierId).toBe(supplier.id);
  });
});

describe("versioned rate cards", () => {
  it("mints a new version on price change; pins survive", async () => {
    const supplier = await demoSupplier();
    const v1 = await demoRate(supplier.id, { costCents: 5000 });
    expect(v1.version).toBe(1);
    const lock = await createSupplierLock(admin, {
      rateId: v1.id,
      startsAt: "2032-03-10T06:00:00Z",
      endsAt: "2032-03-10T18:00:00Z",
    });
    const v2 = await updateSupplierRate(admin, v1.id, { costCents: 6500 });
    expect(v2.version).toBe(2);
    expect(v2.supersedesId).toBe(v1.id);
    // Old version is closed; current listing shows only v2.
    const current = await listSupplierRates(admin, supplier.id);
    expect(current.map((r) => r.version)).toEqual([2]);
    const history = await listSupplierRates(admin, supplier.id, false);
    expect(history).toHaveLength(2);
    // The lock still points at the costed version.
    const pinned = await prisma.supplierLock.findUniqueOrThrow({
      where: { id: lock.id },
      include: { rate: true },
    });
    expect(pinned.rate?.version).toBe(1);
    expect(pinned.rate?.costCents).toBe(5000);
    await expect(updateSupplierRate(admin, v1.id, { costCents: 7000 })).rejects.toThrow(SupplierError);
  });

  it("rejects duplicate service slugs per supplier", async () => {
    const supplier = await demoSupplier();
    const slug = unique("dup-rate");
    await demoRate(supplier.id, { serviceName: slug, serviceSlug: slug });
    await expect(demoRate(supplier.id, { serviceName: slug, serviceSlug: slug })).rejects.toThrow(
      ConflictError,
    );
  });
});

describe("supplier locks", () => {
  it("blocks double-booking beyond capacity and frees on release", async () => {
    const supplier = await demoSupplier();
    const rate = await demoRate(supplier.id, { capacity: 1 });
    const window = { startsAt: "2032-04-01T06:00:00Z", endsAt: "2032-04-03T18:00:00Z" };
    const first = await createSupplierLock(admin, { rateId: rate.id, quantity: 1, ...window });
    expect(first.status).toBe("REQUESTED");
    await expect(createSupplierLock(admin, { rateId: rate.id, quantity: 1, ...window })).rejects.toThrow(
      ConflictError,
    );
    // Non-overlapping window is fine.
    const later = await createSupplierLock(admin, {
      rateId: rate.id,
      quantity: 1,
      startsAt: "2032-04-05T06:00:00Z",
      endsAt: "2032-04-06T18:00:00Z",
    });
    expect(later.status).toBe("REQUESTED");
    // Release frees the capacity.
    await setSupplierLockStatus(admin, first.id, "RELEASED", "test");
    const retry = await createSupplierLock(admin, { rateId: rate.id, quantity: 1, ...window });
    expect(retry.status).toBe("REQUESTED");
  });

  it("refuses locks for paused and blacklisted suppliers", async () => {
    for (const status of ["PAUSED", "BLACKLISTED"] as const) {
      const supplier = await demoSupplier({ status });
      const rate = await demoRate(supplier.id, {});
      await expect(
        createSupplierLock(admin, {
          rateId: rate.id,
          startsAt: "2032-05-01T06:00:00Z",
          endsAt: "2032-05-02T18:00:00Z",
        }),
      ).rejects.toThrow(SupplierError);
    }
  });

  it("enforces the lock state machine", async () => {
    const supplier = await demoSupplier();
    const rate = await demoRate(supplier.id, {});
    const lock = await createSupplierLock(admin, {
      rateId: rate.id,
      startsAt: "2032-06-01T06:00:00Z",
      endsAt: "2032-06-02T18:00:00Z",
    });
    await expect(setSupplierLockStatus(admin, lock.id, "COMPLETED")).rejects.toThrow(SupplierError);
    await setSupplierLockStatus(admin, lock.id, "HELD");
    await setSupplierLockStatus(admin, lock.id, "CONFIRMED");
    const done = await setSupplierLockStatus(admin, lock.id, "COMPLETED");
    expect(done.status).toBe("COMPLETED");
    await expect(setSupplierLockStatus(admin, lock.id, "HELD")).rejects.toThrow(SupplierError);
  });

  it("serializes concurrent locks to capacity", async () => {
    const supplier = await demoSupplier();
    const rate = await demoRate(supplier.id, { capacity: 1 });
    const window = { startsAt: "2032-07-01T06:00:00Z", endsAt: "2032-07-02T18:00:00Z" };
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () => createSupplierLock(admin, { rateId: rate.id, ...window })),
    );
    const won = results.filter((r) => r.status === "fulfilled");
    const lost = results.filter((r) => r.status === "rejected");
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(3);
  });
});

describe("supplier suggestions", () => {
  it("matches type, area and availability; cheapest first", async () => {
    // Unique area per run: the shared test database persists across runs.
    const area = unique("area");
    const cheap = await demoSupplier({ rating: 3, coverageAreas: [area] });
    const pricey = await demoSupplier({ rating: 5, coverageAreas: [area] });
    await demoRate(cheap.id, { costCents: 3000 });
    await demoRate(pricey.id, { costCents: 9000 });
    const paused = await demoSupplier({ status: "PAUSED", coverageAreas: [area] });
    await demoRate(paused.id, { costCents: 1000 });
    const window = { startsAt: "2032-08-01T06:00:00Z", endsAt: "2032-08-02T18:00:00Z" };
    const suggestions = await suggestSuppliers(admin, {
      serviceType: TYPE,
      location: area,
      ...window,
    });
    expect(suggestions.map((s) => s.supplierId)).toEqual([cheap.id, pricey.id]);
  });

  it("skips suppliers with no free capacity", async () => {
    const area = unique("area");
    const supplier = await demoSupplier({ coverageAreas: [area] });
    const rate = await demoRate(supplier.id, { capacity: 1 });
    const window = { startsAt: "2032-09-01T06:00:00Z", endsAt: "2032-09-02T18:00:00Z" };
    await createSupplierLock(admin, { rateId: rate.id, ...window });
    const suggestions = await suggestSuppliers(admin, {
      serviceType: TYPE,
      location: area,
      ...window,
    });
    expect(suggestions.some((s) => s.supplierId === supplier.id)).toBe(false);
  });
});

describe("supplier tokens", () => {
  it("mints single-purpose expiring tokens", async () => {
    const supplier = await demoSupplier();
    const rate = await demoRate(supplier.id, {});
    const lock = await createSupplierLock(admin, {
      rateId: rate.id,
      startsAt: "2032-10-01T06:00:00Z",
      endsAt: "2032-10-02T18:00:00Z",
    });
    const { token } = await mintSupplierResponseToken(admin, lock.id, "availability-response", 72);
    expect(token.startsWith("supt_")).toBe(true);
    // Plaintext is never stored.
    const rows = await prisma.supplierToken.findMany({ where: { lockId: lock.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).not.toContain(token);
    const verified = await verifySupplierToken(token);
    expect(verified.lockId).toBe(lock.id);
    await consumeSupplierToken(token);
    await expect(verifySupplierToken(token)).rejects.toThrow(SupplierError);
  });

  it("rejects expired tokens", async () => {
    const supplier = await demoSupplier();
    const rate = await demoRate(supplier.id, {});
    const lock = await createSupplierLock(admin, {
      rateId: rate.id,
      startsAt: "2032-11-01T06:00:00Z",
      endsAt: "2032-11-02T18:00:00Z",
    });
    const { token } = await mintSupplierResponseToken(admin, lock.id, "availability-response", 0);
    await expect(
      verifySupplierToken(token, new Date(Date.now() + 3600_000)),
    ).rejects.toThrow(SupplierError);
    await expect(verifySupplierToken(`supt_${randomBytes(24).toString("hex")}`)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe("master calendar", () => {
  async function calendarBooking(location: string, start: string, end: string) {
    const booking = await prisma.booking.create({
      data: {
        reference: `ABCT-2033-01-01-${unique("cal").slice(-3)}${Math.floor(Math.random() * 90 + 10)}`,
        customerName: "Calendar Guest",
        customerEmail: `${unique("cal")}@example.com`,
        status: "CONFIRMED",
        travelStart: new Date(start),
        travelEnd: new Date(end),
        adults: 2,
      },
    });
    return booking;
  }

  it("lists bookings by travel date with filters and supplier names", async () => {
    const supplier = await demoSupplier({ coverageAreas: ["Mara"] });
    const booking = await calendarBooking("Mara", "2033-06-10T00:00:00Z", "2033-06-15T00:00:00Z");
    await prisma.serviceLine.create({
      data: {
        bookingId: booking.id,
        seq: 1,
        serviceName: "Stay in Mara",
        serviceType: "hotel-lodge-camp",
        supplierId: supplier.id,
        quantity: 1,
        unit: "PER_PERSON_PER_NIGHT",
        currency: "USD",
        costCents: 1000,
        markupMode: "PERCENT",
        markupBps: 2500,
        markupSource: "GLOBAL",
        clientPriceCents: 1250,
        incomeCents: 250,
        location: "Mara",
      },
    });
    const view = await marketplaceCalendar(admin, new Date("2033-06-01T00:00:00Z"), new Date("2033-07-01T00:00:00Z"), {});
    expect(view.bookings.some((b) => b.reference === booking.reference)).toBe(true);
    const entry = view.bookings.find((b) => b.reference === booking.reference);
    expect(entry?.supplierNames).toContain(supplier.name);

    const byStatus = await marketplaceCalendar(admin, new Date("2033-06-01T00:00:00Z"), new Date("2033-07-01T00:00:00Z"), { status: "NEW" });
    expect(byStatus.bookings.some((b) => b.reference === booking.reference)).toBe(false);
    const bySupplier = await marketplaceCalendar(admin, new Date("2033-06-01T00:00:00Z"), new Date("2033-07-01T00:00:00Z"), { supplierId: supplier.id });
    expect(bySupplier.bookings.some((b) => b.reference === booking.reference)).toBe(true);
    const byLocation = await marketplaceCalendar(admin, new Date("2033-06-01T00:00:00Z"), new Date("2033-07-01T00:00:00Z"), { location: "Mara" });
    expect(byLocation.bookings.some((b) => b.reference === booking.reference)).toBe(true);
    const elsewhere = await marketplaceCalendar(admin, new Date("2033-06-01T00:00:00Z"), new Date("2033-07-01T00:00:00Z"), { location: "Diani" });
    expect(elsewhere.bookings.some((b) => b.reference === booking.reference)).toBe(false);
  });

  it("links commitments back to bookings", async () => {
    const supplier = await demoSupplier();
    const rate = await demoRate(supplier.id, { capacity: 10 });
    const booking = await calendarBooking("Nairobi", "2033-08-10T00:00:00Z", "2033-08-12T00:00:00Z");
    const lock = await createSupplierLock(admin, {
      rateId: rate.id,
      bookingRef: booking.reference,
      startsAt: "2033-08-10T06:00:00Z",
      endsAt: "2033-08-11T18:00:00Z",
    });
    const view = await marketplaceCalendar(admin, new Date("2033-08-01T00:00:00Z"), new Date("2033-09-01T00:00:00Z"), { supplierId: supplier.id });
    const commitment = view.commitments.find((c) => c.lockId === lock.id);
    expect(commitment?.bookingRef).toBe(booking.reference);
    expect(commitment?.bookingId).toBe(booking.id);
    expect(view.conflicts).toHaveLength(0);
  });

  it("warns when overlapping locks exceed capacity", async () => {
    const supplier = await demoSupplier();
    const rate = await demoRate(supplier.id, { capacity: 2 });
    const window = { startsAt: "2033-09-10T06:00:00Z", endsAt: "2033-09-12T18:00:00Z" };
    // Lock 1 (qty 1) + lock 2 would exceed: create lock 2 directly to simulate
    // two separately-approved commitments colliding.
    await createSupplierLock(admin, { rateId: rate.id, quantity: 1, ...window });
    await prisma.supplierLock.create({
      data: {
        supplierId: supplier.id,
        rateId: rate.id,
        serviceName: "Forced overlap",
        serviceType: "airport-transfer",
        startsAt: new Date(window.startsAt),
        endsAt: new Date(window.endsAt),
        quantity: 2,
        status: "CONFIRMED",
      },
    });
    const view = await marketplaceCalendar(admin, new Date("2033-09-01T00:00:00Z"), new Date("2033-10-01T00:00:00Z"), { supplierId: supplier.id });
    expect(view.conflicts).toHaveLength(1);
    expect(view.conflicts[0]?.overBy).toBe(1);
    expect(view.conflicts[0]?.supplierId).toBe(supplier.id);
  });

  it("rejects nonsense windows and filters", async () => {
    await expect(
      marketplaceCalendar(admin, new Date("2033-10-02T00:00:00Z"), new Date("2033-10-01T00:00:00Z"), {}),
    ).rejects.toThrow();
  });
});

describe("supplier payouts", () => {
  it("records dues and settles them under finance control", async () => {
    const supplier = await demoSupplier();
    const payout = await recordSupplierPayout(admin, {
      supplierId: supplier.id,
      bookingRef: "ABCT-2032-01-01-001",
      amountCents: 50000,
      currency: "USD",
    });
    expect(payout.status).toBe("DUE");
    await expect(setSupplierPayoutStatus(agent, payout.id, "PAID")).rejects.toThrow(ForbiddenError);
    const paid = await setSupplierPayoutStatus(finance, payout.id, "PAID");
    expect(paid.status).toBe("PAID");
    expect(paid.paidAt).toBeTruthy();
    await expect(setSupplierPayoutStatus(finance, payout.id, "DUE")).rejects.toThrow(SupplierError);
    const dues = await listSupplierPayouts(finance, { supplierId: supplier.id, status: "DUE" });
    expect(dues).toHaveLength(0);
  });
});

beforeAll(async () => {
  // Seed the type this suite depends on (idempotent across runs).
  await prisma.supplierType.upsert({
    where: { slug: TYPE },
    update: { active: true },
    create: { slug: TYPE, name: "Airport pickup / transfer", active: true },
  });
});
