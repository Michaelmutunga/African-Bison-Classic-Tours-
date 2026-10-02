/**
 * Pure customer-dashboard helpers (portal revamp). Client-safe: no prisma,
 * no Node APIs. Covered by tests/portal-dashboard.test.ts.
 */

export const ACTIVE_BOOKING_STATUSES = [
  "AWAITING_PAYMENT",
  "PARTIALLY_PAID",
  "CONFIRMED",
  "IN_PROGRESS",
] as const;

const PAST_STATUSES = new Set(["COMPLETED", "CANCELLED", "EXPIRED", "REFUNDED"]);

export interface DashboardBookingLike {
  status: string;
  tourTitle: string;
  reference: string;
}

/** First active journey, otherwise the most recent booking. */
export function pickUpcoming<T extends { status: string }>(bookings: T[]): T | undefined {
  const active = new Set<string>(ACTIVE_BOOKING_STATUSES);
  return bookings.find((booking) => active.has(booking.status)) ?? bookings[0];
}

export type JourneyTab = "upcoming" | "past" | "all";

export function tabFilteredBookings<T extends { status: string }>(
  bookings: T[],
  tab: JourneyTab,
): T[] {
  if (tab === "all") return bookings;
  if (tab === "past") return bookings.filter((booking) => PAST_STATUSES.has(booking.status));
  return bookings.filter((booking) => !PAST_STATUSES.has(booking.status));
}

export function searchFilteredBookings<T extends DashboardBookingLike>(
  bookings: T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return bookings;
  return bookings.filter((booking) =>
    [booking.tourTitle, booking.reference, booking.status.replaceAll("_", " ")].some(
      (field) => field.toLowerCase().includes(needle),
    ),
  );
}

/** Whole days from the start of `today` until `startIso` (date part only). */
export function daysUntil(startIso: string | null, today: Date = new Date()): number | null {
  if (!startIso) return null;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const todayDay = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((startDay - todayDay) / 86_400_000);
}

export function countdownLabel(startIso: string | null, status: string, today: Date = new Date()): string {
  if (status === "IN_PROGRESS") return "On safari now";
  if (status === "COMPLETED") return "Completed journey";
  const days = daysUntil(startIso, today);
  if (days === null) return "Dates to confirm with your planner";
  if (days < 0) return "Travel dates have passed";
  if (days === 0) return "You travel today";
  if (days === 1) return "You travel tomorrow";
  return `Starts in ${days} days`;
}

export interface JourneyRange {
  startIso: string;
  endIso: string | null;
}

function toDayString(value: Date): string {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}

function parseDay(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export interface MonthCell {
  key: string;
  day: number | null;
  iso: string | null;
  inRange: boolean;
  isToday: boolean;
}

/**
 * Monday-first month grid. A day is marked when it falls inside any journey
 * range (single-day when the booking has no end date). Comparisons use UTC
 * calendar days so markers never shift with the viewer timezone.
 */
export function journeyMonthCells(
  year: number,
  month: number,
  ranges: JourneyRange[],
  today: Date = new Date(),
): MonthCell[] {
  const valid = ranges.flatMap((range) => {
    const start = parseDay(range.startIso);
    if (!start) return [];
    const end = range.endIso ? (parseDay(range.endIso) ?? start) : start;
    return [{ start: toDayString(start), end: toDayString(end < start ? start : end) }];
  });
  const todayKey = toDayString(today);
  const first = new Date(Date.UTC(year, month, 1));
  const offset = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: MonthCell[] = Array.from({ length: offset }, (_, index) => ({
    key: `empty-${index}`,
    day: null,
    iso: null,
    inRange: false,
    isToday: false,
  }));
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({
      key: iso,
      day,
      iso,
      inRange: valid.some((range) => range.start <= iso && iso <= range.end),
      isToday: iso === todayKey,
    });
  }
  return cells;
}

export function formatDay(iso: string | null): string {
  if (!iso) return "TBC";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBC";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Serializable view models assembled server-side in app/dashboard/page.tsx
 * and app/my-safaris/page.tsx. Only real booking and catalogue data flows
 * in; every image comes from lib/imagery.ts client-photo mappings.
 */
export interface ChecklistItemView {
  key: string;
  label: string;
  detail: string;
  status: "complete" | "pending";
}

export interface DashboardImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface DashboardBookingCard {
  id: string;
  reference: string;
  status: string;
  currency: string;
  totalCents: number;
  paidCents: number;
  depositCents: number;
  party: number;
  travelStart: string | null;
  travelEnd: string | null;
  tourTitle: string;
  tourSlug: string | null;
  tourCategory: string | null;
  travellerCount: number;
  checklist: ChecklistItemView[];
  progressLabel: string;
  progressStage: number;
  progressOf: number;
  countdown: string;
  heroImage: DashboardImage | null;
}

export interface InspirationCard {
  slug: string;
  title: string;
  durationDays: number;
  destinations: string;
  image: DashboardImage | null;
}
