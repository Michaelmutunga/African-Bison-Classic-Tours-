/**
 * Concierge policy (Phase 13). The safari concierge is a controlled
 * assistant, not a general chatbot: every answer is grounded in database
 * facts from an explicit allowlist, and every mutation needs an explicit
 * customer confirmation. Financial actions are never executable here.
 */

export class ConciergeError extends Error {
  readonly status = 422;
  constructor(message: string) {
    super(message);
  }
}

export type ConciergeScope = "public" | "customer";

export type IntentKind =
  | "greet"
  | "destinations_list"
  | "destination_detail"
  | "tours_list"
  | "tour_detail"
  | "faq"
  | "packing"
  | "contact"
  | "booking_status"
  | "booking_itinerary"
  | "booking_payment"
  | "booking_guide"
  | "booking_pickup"
  | "booking_checklist"
  | "contact_planner"
  | "financial"
  | "need_auth"
  | "out_of_scope";

export const CUSTOMER_INTENTS: IntentKind[] = [
  "booking_status",
  "booking_itinerary",
  "booking_payment",
  "booking_guide",
  "booking_pickup",
  "booking_checklist",
];

/** Mutation kinds the concierge may execute — only after confirmation. */
export const CONFIRMABLE_ACTIONS = ["contact_planner"] as const;
export type ConfirmableAction = (typeof CONFIRMABLE_ACTIONS)[number];

/** Anything matching these patterns is refused outright, never executed. */
const FINANCIAL_PATTERNS = [
  /refund/i,
  /\bpay\b/i,
  /payment.*(take|make|process|charge)/i,
  /charge (my|the) card/i,
  /mpesa/i,
  /m-pesa/i,
  /discount/i,
  /cancel.*(booking|trip|safari)/i,
];

const AUTH_PATTERNS = [
  /my (booking|safari|trip|journey|payment|balance|guide|itinerary)/i,
  /\bABCT-\d/i,
  /how much.*(paid|owe|balance)/i,
  /when.*(balance|payment).*due/i,
  /where.*(stay|staying) tonight/i,
  /tomorrow's game drive/i,
  /contact my guide/i,
  /passport/i,
  /checklist/i,
];

export function isFinancialRequest(message: string): boolean {
  return FINANCIAL_PATTERNS.some((pattern) => pattern.test(message));
}

export function looksCustomerScoped(message: string): boolean {
  return AUTH_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Copy guardrail: wildlife is unpredictable, so concierge copy must never
 * promise a sighting. Keep answers in "typically…" planning-guidance terms.
 */
export const NO_GUARANTEE_NOTE =
  "Wildlife moves freely, so sightings are never guaranteed — but our planners will time your route for the best typical conditions.";
