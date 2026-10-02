import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  formatBookingReference,
  isDatedBookingReference,
  issueBookingReference,
  nairobiDateKey,
  parseBookingReference,
  paymentReference,
  quoteVersionReference,
  serviceLineReference,
} from "@/server/booking-references";

describe("booking reference formatting", () => {
  it("zero-pads the daily counter to 3 digits", () => {
    expect(formatBookingReference("2026-10-01", 1)).toBe("ABCT-2026-10-01-001");
    expect(formatBookingReference("2026-10-01", 42)).toBe("ABCT-2026-10-01-042");
    expect(formatBookingReference("2026-10-01", 999)).toBe("ABCT-2026-10-01-999");
  });

  it("grows past 999 instead of wrapping", () => {
    expect(formatBookingReference("2026-10-01", 1000)).toBe("ABCT-2026-10-01-1000");
    expect(formatBookingReference("2026-10-01", 12345)).toBe("ABCT-2026-10-01-12345");
  });

  it("rejects bad inputs", () => {
    expect(() => formatBookingReference("01-10-2026", 1)).toThrow();
    expect(() => formatBookingReference("2026-10-01", 0)).toThrow();
    expect(() => formatBookingReference("2026-10-01", -3)).toThrow();
  });

  it("round-trips through parse", () => {
    const ref = "ABCT-2026-10-01-007";
    expect(parseBookingReference(ref)).toEqual({ dateKey: "2026-10-01", sequence: 7 });
    expect(isDatedBookingReference(ref)).toBe(true);
  });

  it("rejects legacy random refs from the dated parser", () => {
    expect(parseBookingReference("ABCT-2026-X7K9Q2")).toBeNull();
    expect(isDatedBookingReference("ABCT-2026-X7K9Q2")).toBe(false);
  });

  it("builds derived traceability refs", () => {
    const base = "ABCT-2026-10-01-001";
    expect(quoteVersionReference(base, 1)).toBe("ABCT-2026-10-01-001-Q1");
    expect(quoteVersionReference(base, 2)).toBe("ABCT-2026-10-01-001-Q2");
    expect(serviceLineReference(base, 1)).toBe("ABCT-2026-10-01-001-S1");
    expect(serviceLineReference(base, 12)).toBe("ABCT-2026-10-01-001-S12");
    expect(paymentReference(base, 1)).toBe("ABCT-2026-10-01-001-P1");
    expect(() => quoteVersionReference(base, 0)).toThrow();
    expect(() => serviceLineReference(base, 0)).toThrow();
    expect(() => paymentReference(base, 0)).toThrow();
  });
});

describe("Nairobi creation-date key", () => {
  it("uses Africa/Nairobi, not UTC", () => {
    // 23:59 Nairobi on Sep 30 (20:59 UTC) vs 00:01 Nairobi on Oct 1 (21:01 UTC).
    expect(nairobiDateKey(new Date("2026-09-30T20:59:00Z"))).toBe("2026-09-30");
    expect(nairobiDateKey(new Date("2026-09-30T21:01:00Z"))).toBe("2026-10-01");
  });

  it("is stable across the Nairobi day", () => {
    expect(nairobiDateKey(new Date("2026-10-01T00:00:00+03:00"))).toBe("2026-10-01");
    expect(nairobiDateKey(new Date("2026-10-01T23:59:59+03:00"))).toBe("2026-10-01");
  });
});

describe("atomic issuance", () => {
  // Fixed date keys against the shared bison_test database: clear them before
  // each test so reruns are hermetic (counters otherwise accumulate across
  // runs and absolute 001-based assertions fail on the second run).
  const days = ["2031-05-17", "2031-05-18", "2031-05-19", "2031-05-20", "2031-05-21"];
  beforeEach(async () => {
    await prisma.bookingDailyCounter.deleteMany({ where: { date: { in: days } } });
  });

  async function issueAt(iso: string): Promise<string> {
    return prisma.$transaction((tx) => issueBookingReference(tx, new Date(iso)));
  }

  it("starts at 001 and increments within a day", async () => {
    const day = "2031-05-17";
    expect(await issueAt(`${day}T09:00:00+03:00`)).toBe(`ABCT-${day}-001`);
    expect(await issueAt(`${day}T10:00:00+03:00`)).toBe(`ABCT-${day}-002`);
  });

  it("resets the counter on day rollover", async () => {
    expect(await issueAt("2031-05-18T23:30:00+03:00")).toBe("ABCT-2031-05-18-001");
    // Two minutes later it is the next Nairobi day.
    expect(await issueAt("2031-05-19T00:02:00+03:00")).toBe("ABCT-2031-05-19-001");
  });

  it("never issues duplicates under concurrency", async () => {
    const day = "2031-05-20";
    const refs = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        issueAt(`${day}T${String(8 + Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00+03:00`),
      ),
    );
    expect(new Set(refs).size).toBe(10);
    const sequences = refs.map((ref) => parseBookingReference(ref)?.sequence).sort((a, b) => (a ?? 0) - (b ?? 0));
    expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("grows to 4 digits past 999", async () => {
    const day = "2031-05-21";
    await prisma.bookingDailyCounter.upsert({
      where: { date: day },
      update: { count: 999 },
      create: { date: day, count: 999 },
    });
    expect(await issueAt(`${day}T09:00:00+03:00`)).toBe(`ABCT-${day}-1000`);
    expect(await issueAt(`${day}T09:01:00+03:00`)).toBe(`ABCT-${day}-1001`);
  });
});
