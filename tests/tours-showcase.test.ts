import { describe, expect, it } from "vitest";
import {
  bringStackToFront,
  clampWheelIndex,
  decodeShowcaseText,
  durationRange,
  filterShowcaseTours,
  identityStackOrder,
  rotateStackBackward,
  rotateStackForward,
  wheelIndexForSlug,
  wheelOptionAngle,
  wheelPointPosition,
  wheelRingRotation,
  type ShowcaseTour,
} from "@/components/tours/showcase";

function tour(slug: string, categorySlug: string, durationDays: number): ShowcaseTour {
  return {
    slug,
    title: slug,
    categorySlug,
    categoryLabel: categorySlug,
    durationDays,
    excerpt: "excerpt",
    image: null,
  };
}

describe("filterShowcaseTours", () => {
  const tours = [
    tour("a", "kenya", 3),
    tour("b", "tanzania", 5),
    tour("c", "kenya", 7),
  ];

  it("returns everything for the all selection", () => {
    expect(filterShowcaseTours(tours, "all")).toHaveLength(3);
  });

  it("filters to the active region", () => {
    expect(filterShowcaseTours(tours, "kenya").map((t) => t.slug)).toEqual([
      "a",
      "c",
    ]);
  });

  it("returns an empty list for an unknown region", () => {
    expect(filterShowcaseTours(tours, "nope")).toHaveLength(0);
  });
});

describe("decodeShowcaseText", () => {
  it("decodes entities carried over by the content migration", () => {
    expect(decodeShowcaseText("Kenya &amp; Tanzania")).toBe("Kenya & Tanzania");
    expect(decodeShowcaseText("plain title")).toBe("plain title");
  });
});

describe("durationRange", () => {
  it("is null-safe for empty lists", () => {
    expect(durationRange([])).toEqual({ min: null, max: null });
  });

  it("reports min and max days", () => {
    const tours = [tour("a", "kenya", 3), tour("b", "kenya", 10)];
    expect(durationRange(tours)).toEqual({ min: 3, max: 10 });
  });
});

describe("wheel geometry", () => {
  it("places the active option at the top", () => {
    const total = 4;
    for (let active = 0; active < total; active++) {
      const angle = wheelOptionAngle(active, total) + wheelRingRotation(active, total);
      // -90deg is the top; normalise floating point noise.
      expect(Math.abs(angle + 90)).toBeLessThan(1e-9);
    }
  });

  it("spreads options evenly around the dial", () => {
    expect(wheelOptionAngle(0, 4)).toBe(-90);
    expect(wheelOptionAngle(1, 4)).toBe(0);
    expect(wheelOptionAngle(2, 4)).toBe(90);
    expect(wheelOptionAngle(3, 4)).toBe(180);
  });

  it("maps angles to circle percentages", () => {
    expect(wheelPointPosition(-90, 36)).toEqual({ left: 50, top: 14 });
    const right = wheelPointPosition(0, 36);
    expect(right.left).toBeCloseTo(86, 9);
    expect(right.top).toBeCloseTo(50, 9);
  });

  it("falls back to All for unknown slugs and wraps indices", () => {
    expect(wheelIndexForSlug(["all", "kenya"], "kenya")).toBe(1);
    expect(wheelIndexForSlug(["all", "kenya"], "nope")).toBe(0);
    expect(clampWheelIndex(-1, 4)).toBe(3);
    expect(clampWheelIndex(4, 4)).toBe(0);
    expect(clampWheelIndex(0, 0)).toBe(0);
  });
});

describe("stack order", () => {
  it("rotates forward and backward", () => {
    expect(rotateStackForward([0, 1, 2])).toEqual([1, 2, 0]);
    expect(rotateStackBackward([1, 2, 0])).toEqual([0, 1, 2]);
  });

  it("leaves tiny decks alone", () => {
    expect(rotateStackForward([0])).toEqual([0]);
    expect(rotateStackBackward([])).toEqual([]);
  });

  it("brings any card to the front", () => {
    expect(bringStackToFront([0, 1, 2, 3], 2)).toEqual([2, 3, 0, 1]);
    expect(bringStackToFront([0, 1, 2], 0)).toEqual([0, 1, 2]);
  });

  it("builds identity orders", () => {
    expect(identityStackOrder(3)).toEqual([0, 1, 2]);
    expect(identityStackOrder(0)).toEqual([]);
  });
});
