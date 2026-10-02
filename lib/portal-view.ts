/**
 * Pure portal view helpers (Phase 8). Client-safe: no prisma, no Node APIs.
 * The server layer re-exports these for a single import surface.
 */

export interface ChecklistInput {
  depositCents: number;
  paidCents: number;
  totalCents: number;
  adults: number;
  children: number;
  travelStart: Date | string | null;
  travellers: { fullName?: string; nationality: string | null; passportNumber: string | null }[];
}

export interface ChecklistItem {
  key: string;
  label: string;
  detail: string;
  status: "complete" | "pending";
}

export function bookingChecklist(booking: ChecklistInput): ChecklistItem[] {
  const party = booking.adults + booking.children;
  const depositDone = booking.depositCents <= 0 || booking.paidCents >= booking.depositCents;
  const detailsDone =
    booking.travellers.length > 0 &&
    booking.travellers.every((t) => (t.fullName ?? "").trim().length >= 2);
  const passportsDone =
    booking.travellers.length > 0 &&
    booking.travellers.every((t) => !!t.nationality && !!t.passportNumber);
  const paidInFull = booking.totalCents <= 0 || booking.paidCents >= booking.totalCents;
  return [
    {
      key: "deposit",
      label: "Deposit paid",
      detail: depositDone ? "Deposit received — thank you." : "Pay the deposit to confirm your places.",
      status: depositDone ? "complete" : "pending",
    },
    {
      key: "travellers",
      label: "Traveller details complete",
      detail: `${booking.travellers.length} of ${party} traveller${party === 1 ? "" : "s"} listed.`,
      status: detailsDone ? "complete" : "pending",
    },
    {
      key: "passports",
      label: "Passport details",
      detail: passportsDone
        ? "All travellers have passport details on file."
        : "We need nationality and passport numbers before park entries are issued.",
      status: passportsDone ? "complete" : "pending",
    },
    {
      key: "balance",
      label: "Final balance",
      detail: paidInFull ? "Paid in full." : "Due before travel — your planner confirms the date.",
      status: paidInFull ? "complete" : "pending",
    },
    {
      key: "dates",
      label: "Travel dates",
      detail: booking.travelStart ? "Dates confirmed." : "Dates to be confirmed with your planner.",
      status: booking.travelStart ? "complete" : "pending",
    },
  ];
}

const STAGE_ORDER = [
  "NEW",
  "IN_REVIEW",
  "SUPPLIERS_PENDING",
  "QUOTE_DRAFT",
  "QUOTE_APPROVED",
  "QUOTE_SENT",
  "CLIENT_REVISION",
  "AWAITING_PAYMENT",
  "PARTIALLY_PAID",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export function journeyProgress(status: string): { stage: number; of: number; label: string } {
  const index = (STAGE_ORDER as readonly string[]).indexOf(status);
  if (index < 0) return { stage: 0, of: STAGE_ORDER.length, label: status };
  return { stage: index + 1, of: STAGE_ORDER.length, label: status.replaceAll("_", " ") };
}

export function tripDayNumber(travelStart: Date | string | null, now: Date = new Date()): number | null {
  if (!travelStart) return null;
  const start = travelStart instanceof Date ? travelStart : new Date(travelStart);
  const diff = Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1;
  return diff >= 1 ? diff : null;
}
