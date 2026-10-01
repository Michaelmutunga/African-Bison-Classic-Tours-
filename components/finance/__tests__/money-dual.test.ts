import { describe, expect, it } from "vitest";
import { convertCents, minorUnitsPerMajor } from "@/lib/money";
import { rateCaption } from "@/components/finance/money-dual";

describe("dashboard currency correctness", () => {
  it("uses whole shillings for KES inputs", () => {
    expect(minorUnitsPerMajor("KES")).toBe(1);
    expect(minorUnitsPerMajor("USD")).toBe(100);
    // Guest typing 129000 KES must not be multiplied by 100.
    expect(Math.round(129000 * minorUnitsPerMajor("KES"))).toBe(129000);
    expect(Math.round(1000 * minorUnitsPerMajor("USD"))).toBe(100000);
  });

  it("converts USD to KES via explicit rate snapshot", () => {
    expect(convertCents(100000, 1, 129)).toBe(12900000);
  });

  it("builds rate captions with dates", () => {
    expect(rateCaption(129, "2026-06-12T00:00:00.000Z")).toContain("1 USD = 129 KES");
    expect(rateCaption(null, null)).toBeNull();
  });
});
