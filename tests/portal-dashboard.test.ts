import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  daysUntil,
  formatDay,
  journeyMonthCells,
  pickUpcoming,
  searchFilteredBookings,
  tabFilteredBookings,
} from "@/lib/dashboard";

const bookings = [
  { status: "COMPLETED", tourTitle: "Best of Kenya Safari Tour", reference: "ABCT-2026-000101" },
  { status: "CONFIRMED", tourTitle: "Masai Mara Migration Safari", reference: "ABCT-2026-000102" },
  { status: "CANCELLED", tourTitle: "Amboseli Short Break", reference: "ABCT-2026-000103" },
];

describe("pickUpcoming", () => {
  it("prefers the first active journey", () => {
    expect(pickUpcoming(bookings)?.reference).toBe("ABCT-2026-000102");
  });

  it("falls back to the most recent booking", () => {
    expect(pickUpcoming([bookings[0]])?.reference).toBe("ABCT-2026-000101");
  });

  it("returns undefined for no bookings", () => {
    expect(pickUpcoming([])).toBeUndefined();
  });
});

describe("tabFilteredBookings", () => {
  it("splits upcoming from past journeys", () => {
    expect(tabFilteredBookings(bookings, "upcoming").map((b) => b.reference)).toEqual([
      "ABCT-2026-000102",
    ]);
    expect(tabFilteredBookings(bookings, "past").map((b) => b.reference)).toEqual([
      "ABCT-2026-000101",
      "ABCT-2026-000103",
    ]);
    expect(tabFilteredBookings(bookings, "all")).toHaveLength(3);
  });
});

describe("searchFilteredBookings", () => {
  it("matches title, reference and status", () => {
    expect(searchFilteredBookings(bookings, "mara")).toHaveLength(1);
    expect(searchFilteredBookings(bookings, "abct-2026-000101")).toHaveLength(1);
    expect(searchFilteredBookings(bookings, "cancelled")).toHaveLength(1);
    expect(searchFilteredBookings(bookings, "  ")).toHaveLength(3);
    expect(searchFilteredBookings(bookings, "zanzibar")).toHaveLength(0);
  });
});

describe("daysUntil and countdownLabel", () => {
  const today = new Date("2027-09-10T12:00:00Z");

  it("counts whole calendar days", () => {
    expect(daysUntil("2027-09-18T06:00:00Z", today)).toBe(8);
    expect(daysUntil("2027-09-10T23:59:00Z", today)).toBe(0);
    expect(daysUntil(null, today)).toBeNull();
    expect(daysUntil("not-a-date", today)).toBeNull();
  });

  it("labels the journey state in plain words", () => {
    expect(countdownLabel("2027-09-18T06:00:00Z", "CONFIRMED", today)).toBe("Starts in 8 days");
    expect(countdownLabel("2027-09-10T06:00:00Z", "CONFIRMED", today)).toBe("You travel today");
    expect(countdownLabel("2027-09-11T06:00:00Z", "CONFIRMED", today)).toBe("You travel tomorrow");
    expect(countdownLabel("2027-09-01T06:00:00Z", "CONFIRMED", today)).toBe(
      "Travel dates have passed",
    );
    expect(countdownLabel("2027-09-18T06:00:00Z", "IN_PROGRESS", today)).toBe("On safari now");
    expect(countdownLabel(null, "NEW", today)).toBe("Dates to confirm with your planner");
  });
});

describe("journeyMonthCells", () => {
  it("marks days inside a travel range and today", () => {
    const cells = journeyMonthCells(
      2027,
      8,
      [{ startIso: "2027-09-18T06:00:00Z", endIso: "2027-09-20T18:00:00Z" }],
      new Date("2027-09-19T12:00:00Z"),
    );
    const marked = cells.filter((cell) => cell.inRange).map((cell) => cell.day);
    expect(marked).toEqual([18, 19, 20]);
    expect(cells.find((cell) => cell.day === 19)?.isToday).toBe(true);
    expect(cells.find((cell) => cell.day === 21)?.inRange).toBe(false);
  });

  it("treats a missing end date as a single day", () => {
    const cells = journeyMonthCells(2027, 8, [{ startIso: "2027-09-05T00:00:00Z", endIso: null }]);
    expect(cells.filter((cell) => cell.inRange).map((cell) => cell.day)).toEqual([5]);
  });

  it("ignores unparseable ranges", () => {
    const cells = journeyMonthCells(2027, 8, [{ startIso: "nope", endIso: null }]);
    expect(cells.some((cell) => cell.inRange)).toBe(false);
  });
});

describe("formatDay", () => {
  it("formats honestly and never throws", () => {
    expect(formatDay("2027-09-18T06:00:00Z")).toBe("18 Sept 2027");
    expect(formatDay(null)).toBe("TBC");
    expect(formatDay("nope")).toBe("TBC");
  });
});
