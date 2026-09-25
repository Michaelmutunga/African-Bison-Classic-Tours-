import { describe, expect, it } from "vitest";
import {
  applyBps,
  convertCents,
  formatMoney,
  minorUnitsPerMajor,
} from "@/lib/money";

describe("basis-point math", () => {
  it("computes exact percentages without floats", () => {
    expect(applyBps(10_000, 3000)).toBe(3000); // 30% deposit
    expect(applyBps(10_000, 3333)).toBe(3333);
    expect(applyBps(40_000, 11_500)).toBe(46_000); // migration uplift
    expect(applyBps(40_000, 9000)).toBe(36_000); // green season
  });

  it("rounds once at the line boundary", () => {
    expect(applyBps(1, 11_500)).toBe(1); // 1.15 -> 1
    expect(applyBps(50, 11_500)).toBe(58); // 57.5 -> 58
    expect(applyBps(999, 3333)).toBe(333); // 332.9667 -> 333
  });

  it("rejects negative or fractional inputs", () => {
    expect(() => applyBps(-100, 1000)).toThrow();
    expect(() => applyBps(100.5, 1000)).toThrow();
    expect(() => applyBps(100, -5)).toThrow();
  });
});

describe("currency conversion", () => {
  it("converts through explicit rate snapshots", () => {
    // $100 (10_000c) at KES 129/USD -> 1_290_000 minor units (shillings).
    expect(convertCents(10_000, 1, 129)).toBe(1_290_000);
    expect(convertCents(1_290_000, 129, 1)).toBe(10_000);
  });

  it("rejects non-positive rates", () => {
    expect(() => convertCents(100, 0, 129)).toThrow();
    expect(() => convertCents(100, 1, -2)).toThrow();
  });
});

describe("formatting", () => {
  it("formats major currencies", () => {
    expect(formatMoney(324_000, "USD")).toBe("$3,240.00");
    const kes = formatMoney(1_290_000, "KES");
    expect(kes).toContain("1,290,000");
    // Node ICU renders the code ("KES …"); browsers may render "KSh".
    expect(/^KES\s|^KSh?\s/.test(kes)).toBe(true);
  });

  it("rejects unsupported currencies", () => {
    expect(() => formatMoney(100, "JPY")).toThrow();
    expect(minorUnitsPerMajor("USD")).toBe(100);
    expect(minorUnitsPerMajor("KES")).toBe(1);
  });
});
