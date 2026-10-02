import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import { createBooking, setBookingStatus } from "@/server/bookings";
import { addServiceLine } from "@/server/marketplace-pricing";
import { createSupplier, createSupplierRate, recordSupplierPayout, setSupplierPayoutStatus } from "@/server/suppliers";
import {
  funnelReport,
  incomePerBooking,
  incomePerMonth,
  incomePerServiceType,
  incomePerSupplier,
  outstandingClients,
  outstandingPayouts,
} from "@/server/reports";
import { testActor, unique } from "@/tests/db";

const admin = testActor("ADMIN");
const finance = testActor("FINANCE_USER");
const agent = testActor("RESERVATION_STAFF");

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

async function reportBooking(currency = "USD", createdAt?: Date) {
  const booking = await createBooking(null, {
    customerName: "Report Guest",
    customerEmail: `${unique("rep")}@example.com`,
    currency,
    adults: 2,
  });
  if (createdAt) await prisma.booking.update({ where: { id: booking.id }, data: { createdAt } });
  return booking;
}

describe("report access", () => {
  it("restricts cost data to finance roles", async () => {
    await expect(incomePerBooking(agent, {})).rejects.toThrow(ForbiddenError);
    await expect(incomePerBooking(null, {})).rejects.toThrow(UnauthorizedError);
    await expect(outstandingPayouts(agent)).rejects.toThrow(ForbiddenError);
    // Finance passes the gate.
    await expect(incomePerBooking(finance, {})).resolves.toBeDefined();
  });

  it("rejects nonsense windows", async () => {
    await expect(incomePerBooking(finance, { from: "2033-02-01T00:00:00Z", to: "2033-01-01T00:00:00Z" })).rejects.toThrow();
  });
});

describe("income splits", () => {
  it("reports per-booking income with honest margins", async () => {
    const booking = await reportBooking();
    await addServiceLine(admin, booking.id, {
      serviceName: "Report transfer",
      serviceType: "airport-transfer",
      costCents: 8_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    const rows = await incomePerBooking(finance, {});
    const row = rows.find((r) => r.bookingId === booking.id);
    expect(row?.lines).toBe(1);
    expect(row?.splits).toEqual([{ currency: "USD", costCents: 8_000, clientCents: 10_000, incomeCents: 2_000, marginBps: 2000 }]);
  });

  it("keeps currencies separate", async () => {
    const usd = await reportBooking("USD");
    const kes = await reportBooking("KES");
    await addServiceLine(admin, usd.id, {
      serviceName: "USD line",
      serviceType: "airport-transfer",
      costCents: 8_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    await addServiceLine(admin, kes.id, {
      serviceName: "KES line",
      serviceType: "airport-transfer",
      costCents: 12_900,
      currency: "KES",
      unit: "PER_TRANSFER",
    });
    const rows = await incomePerBooking(finance, {});
    const kesRow = rows.find((r) => r.bookingId === kes.id);
    expect(kesRow?.splits).toHaveLength(1);
    expect(kesRow?.splits[0]?.currency).toBe("KES");
    // 12_900 KES cost + 25% = 16_125 KES client.
    expect(kesRow?.splits[0]).toMatchObject({ costCents: 12_900, clientCents: 16_125, incomeCents: 3_225 });
  });

  it("splits by supplier with an unassigned bucket", async () => {
    const suffix = unique("rsup");
    const supplier = await createSupplier(admin, {
      name: `Report Supplier ${suffix}`,
      typeSlugs: ["airport-transfer"],
      coverageAreas: ["Nairobi"],
    });
    const rate = await createSupplierRate(admin, supplier.id, {
      serviceName: `Report rate ${suffix}`,
      serviceType: "airport-transfer",
      unit: "PER_TRANSFER",
      currency: "USD",
      costCents: 4_000,
      capacity: 10,
    });
    const booking = await reportBooking();
    await addServiceLine(admin, booking.id, {
      serviceName: "Assigned line",
      serviceType: "airport-transfer",
      supplierId: supplier.id,
      rateId: rate.id,
      unit: "PER_TRANSFER",
    });
    await addServiceLine(admin, booking.id, {
      serviceName: "Unassigned line",
      serviceType: "airport-transfer",
      costCents: 2_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    const rows = await incomePerSupplier(finance, {});
    const mine = rows.find((r) => r.supplierId === supplier.id);
    expect(mine?.lines).toBeGreaterThanOrEqual(1);
    expect(mine?.splits[0]?.incomeCents).toBeGreaterThan(0);
    expect(rows.some((r) => r.supplierId === null && r.supplierName === "Unassigned")).toBe(true);
  });

  it("splits by service type", async () => {
    const booking = await reportBooking();
    await addServiceLine(admin, booking.id, {
      serviceName: "Typed line",
      serviceType: "airport-transfer",
      costCents: 1_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    const rows = await incomePerServiceType(finance, {});
    expect(rows.some((r) => r.serviceType === "airport-transfer" && r.lines >= 1)).toBe(true);
  });

  it("separates pipeline from realised income by month", async () => {
    const open = await reportBooking("USD", new Date("2033-05-15T12:00:00Z"));
    const shut = await reportBooking("USD", new Date("2033-05-16T12:00:00Z"));
    for (const booking of [open, shut]) {
      await addServiceLine(admin, booking.id, {
        serviceName: "Monthly line",
        serviceType: "airport-transfer",
        costCents: 4_000,
        currency: "USD",
        unit: "PER_TRANSFER",
      });
    }
    await prisma.booking.update({ where: { id: shut.id }, data: { status: "COMPLETED" } });
    const rows = await incomePerMonth(finance, { from: "2033-05-01T00:00:00Z", to: "2033-06-01T00:00:00Z" });
    const may = rows.find((r) => r.month === "2033-05");
    expect(may).toBeTruthy();
    expect(may?.pipeline[0]?.incomeCents).toBe(1_000);
    expect(may?.realised[0]?.incomeCents).toBe(1_000);
  });
});

describe("outstanding money", () => {
  it("tracks client balances against priced totals", async () => {
    const booking = await reportBooking();
    await addServiceLine(admin, booking.id, {
      serviceName: "Balance line",
      serviceType: "airport-transfer",
      costCents: 8_000,
      currency: "USD",
      unit: "PER_TRANSFER",
    });
    const before = (await outstandingClients(finance)).find((r) => r.bookingId === booking.id);
    expect(before?.outstandingCents).toBe(10_000);
    await prisma.booking.update({ where: { id: booking.id }, data: { paidCents: 4_000 } });
    const after = (await outstandingClients(finance)).find((r) => r.bookingId === booking.id);
    expect(after?.outstandingCents).toBe(6_000);
    await prisma.booking.update({ where: { id: booking.id }, data: { paidCents: 10_000 } });
    const settled = (await outstandingClients(finance)).find((r) => r.bookingId === booking.id);
    expect(settled).toBeUndefined();
  });

  it("tracks due supplier payouts until settled", async () => {
    const suffix = unique("rpay");
    const supplier = await createSupplier(admin, {
      name: `Payout Supplier ${suffix}`,
      typeSlugs: ["airport-transfer"],
      coverageAreas: ["Nairobi"],
    });
    const payout = await recordSupplierPayout(admin, {
      supplierId: supplier.id,
      bookingRef: `ABCT-2033-01-01-${suffix.slice(-3)}`,
      amountCents: 50_000,
      currency: "USD",
    });
    const due = await outstandingPayouts(finance);
    expect(due.find((r) => r.supplierId === supplier.id)?.splits).toEqual([{ currency: "USD", dueCents: 50_000 }]);
    await setSupplierPayoutStatus(finance, payout.id, "PAID");
    const after = await outstandingPayouts(finance);
    expect(after.find((r) => r.supplierId === supplier.id)).toBeUndefined();
  });
});

describe("funnel", () => {
  it("measures conversion and time to quote inside a window", async () => {
    const created = new Date("2033-07-01T12:00:00Z");
    const booking = await reportBooking("USD", created);
    for (const status of ["IN_REVIEW", "SUPPLIERS_PENDING", "QUOTE_DRAFT", "QUOTE_APPROVED", "QUOTE_SENT"] as const) {
      await setBookingStatus(admin, booking.id, status);
    }
    // Quote sent 30 hours after submission.
    const sentAt = new Date(created.getTime() + 30 * 3_600_000);
    await prisma.bookingStatusHistory.updateMany({
      where: { bookingId: booking.id, to: "QUOTE_SENT" },
      data: { createdAt: sentAt },
    });
    for (const status of ["AWAITING_PAYMENT", "CONFIRMED"] as const) {
      await setBookingStatus(admin, booking.id, status);
    }
    const funnel = await funnelReport(finance, { from: "2033-07-01T00:00:00Z", to: "2033-08-01T00:00:00Z" });
    expect(funnel.submitted).toBeGreaterThanOrEqual(1);
    expect(funnel.confirmed).toBeGreaterThanOrEqual(1);
    expect(funnel.conversionPct).toBeGreaterThan(0);
    expect(funnel.avgHoursToQuote).toBe(30);
    const empty = await funnelReport(finance, { from: "2034-01-01T00:00:00Z", to: "2034-02-01T00:00:00Z" });
    expect(empty).toMatchObject({ submitted: 0, confirmed: 0, conversionPct: 0, avgHoursToQuote: null });
  });
});
