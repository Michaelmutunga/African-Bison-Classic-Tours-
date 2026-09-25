import { describe, expect, it } from "vitest";
import {
  EMPTY_DRAFT,
  allocateNights,
  draftSummary,
  generateItinerary,
  journeyProfile,
  restoreDraft,
  tripDays,
  validateDraft,
  type BuilderDraft,
} from "@/lib/builder";

function draft(overrides: Partial<BuilderDraft> = {}): BuilderDraft {
  const nextYear = new Date().getFullYear() + 1;
  return {
    ...EMPTY_DRAFT,
    regions: ["kenya"],
    startDate: `${nextYear}-08-10`,
    endDate: `${nextYear}-08-16`,
    travelStyle: "private",
    comfort: "mid-range",
    transport: "land-cruiser",
    destinationSlugs: ["amboseli", "masai-mara"],
    ...overrides,
  };
}

const DESTINATIONS = [
  { slug: "amboseli", name: "Amboseli National Park" },
  { slug: "masai-mara", name: "Maasai Mara National Reserve" },
  { slug: "serengeti", name: "Serengeti National Park" },
];

describe("trip days", () => {
  it("counts inclusive days", () => {
    expect(tripDays({ startDate: "2027-08-10", endDate: "2027-08-16" })).toBe(7);
    expect(tripDays({ startDate: "2027-08-10", endDate: "2027-08-10" })).toBe(1);
    expect(tripDays({ startDate: "", endDate: "" })).toBe(0);
  });
});

describe("night allocation", () => {
  it("gives every stop at least one day and leftovers to earliest stops", () => {
    expect(allocateNights(7, 2)).toEqual([4, 3]);
    expect(allocateNights(3, 3)).toEqual([1, 1, 1]);
    expect(allocateNights(5, 1)).toEqual([5]);
    expect(allocateNights(4, 0)).toEqual([]);
  });
});

describe("draft validation", () => {
  it("accepts a complete draft", () => {
    expect(validateDraft(draft())).toEqual([]);
  });

  it("rejects missing regions, destinations and style", () => {
    const errors = validateDraft(
      draft({ regions: [], destinationSlugs: [], travelStyle: "", comfort: "", transport: "" }),
    );
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects end before start and past dates", () => {
    expect(
      validateDraft(draft({ startDate: "2027-08-16", endDate: "2027-08-10" })),
    ).toContain("Trips need at least 2 days (end date after start date)");
    expect(validateDraft(draft({ startDate: "2020-01-01", endDate: "2020-01-05" }))).toContain(
      "Start date is in the past",
    );
  });

  it("rejects oversized trips with a human handoff", () => {
    expect(validateDraft(draft({ adults: 16, children: 3 }))).toContain(
      "Groups over 18 travel as group safaris — send an enquiry",
    );
  });
});

describe("itinerary generation", () => {
  it("builds ordered days with arrival and departure", () => {
    const itinerary = generateItinerary(draft(), DESTINATIONS, new Map());
    expect(itinerary.totalDays).toBe(7);
    expect(itinerary.days).toHaveLength(7);
    expect(itinerary.days[0]?.legs.some((l) => l.kind === "arrival")).toBe(true);
    expect(itinerary.days[6]?.legs.some((l) => l.kind === "departure")).toBe(true);
    expect(itinerary.route).toEqual([
      { slug: "amboseli", name: "Amboseli National Park", nights: 4 },
      { slug: "masai-mara", name: "Maasai Mara National Reserve", nights: 3 },
    ]);
  });

  it("inserts transfers between stops and attaches add-ons once", () => {
    const itinerary = generateItinerary(
      draft({ addOnSlugs: ["balloon"] }),
      DESTINATIONS,
      new Map([["balloon", "Hot air balloon safari"]]),
    );
    const transfers = itinerary.days.flatMap((d) =>
      d.legs.filter((l) => l.kind === "transfer"),
    );
    expect(transfers).toHaveLength(1);
    expect(transfers[0]?.text).toContain("Amboseli National Park → Maasai Mara National Reserve");
    const withAddOns = itinerary.days.filter((d) => d.activities.length > 0);
    expect(withAddOns).toHaveLength(1);
    expect(withAddOns[0]?.activities).toEqual(["Hot air balloon safari"]);
  });

  it("throws on invalid drafts", () => {
    expect(() => generateItinerary(draft({ destinationSlugs: [] }), DESTINATIONS, new Map())).toThrow();
    expect(() =>
      generateItinerary(draft({ startDate: "2027-08-10", endDate: "2027-08-10" }), DESTINATIONS, new Map()),
    ).toThrow();
  });
});

describe("journey profile", () => {
  it("reflects comfort and interests", () => {
    const profile = journeyProfile(
      draft({ comfort: "luxury", interests: ["photography", "culture"] }),
    );
    expect(profile.find((p) => p.slug === "comfort")?.level).toBe(5);
    expect(profile.find((p) => p.slug === "photography")?.level).toBe(5);
    expect(profile.find((p) => p.slug === "culture")?.level).toBe(5);
    for (const axis of profile) {
      expect(axis.level).toBeGreaterThanOrEqual(1);
      expect(axis.level).toBeLessThanOrEqual(5);
    }
  });
});

describe("draft restore", () => {
  it("restores mid-flow drafts that full validation would reject", () => {
    const stored = JSON.stringify({ ...EMPTY_DRAFT, regions: ["kenya"] });
    expect(restoreDraft(stored).regions).toEqual(["kenya"]);
  });

  it("falls back to empty on garbage", () => {
    expect(restoreDraft("not-json{{{")).toEqual(EMPTY_DRAFT);
    expect(restoreDraft(null)).toEqual(EMPTY_DRAFT);
    expect(restoreDraft({ regions: ["kenya"], adults: 99 })).toEqual(EMPTY_DRAFT);
  });
});

describe("draft summary", () => {
  it("renders a planner-readable summary", () => {
    const summary = draftSummary(
      draft({ children: 1 }),
      new Map(DESTINATIONS.map((d) => [d.slug, d.name])),
    );
    expect(summary).toContain("Amboseli National Park → Maasai Mara National Reserve");
    expect(summary).toContain("2 adults, 1 child");
    expect(summary).toContain("7 days");
  });
});
