/**
 * Money handling (Phase 5). All amounts are integer minor units (cents).
 * Floating point is NEVER used for financial math — percentages use basis
 * points with a single Math.round at each line boundary.
 */

export const SUPPORTED_CURRENCIES = ["KES", "USD", "EUR", "GBP"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const BASE_CURRENCY: Currency = "USD";

/** Deposit due at confirmation, in basis points (3000 = 30%). */
export const DEPOSIT_BPS = 3000;

/** Children (2–11) pay this share of the adult base rate, in basis points. */
export const CHILD_RATE_BPS = 5000;

/**
 * Minor units per major unit. KES has no minor unit in practice, so KES
 * amounts are stored as whole shillings (Stripe zero-decimal convention).
 */
export function minorUnitsPerMajor(currency: string): number {
  assertCurrency(currency);
  return currency === "KES" ? 1 : 100;
}

export function assertCurrency(code: string): asserts code is Currency {
  if (!(SUPPORTED_CURRENCIES as readonly string[]).includes(code)) {
    throw new Error(`Unsupported currency: ${code}`);
  }
}

/** Multiply minor units by basis points, rounding once. */
export function applyBps(amountCents: number, bps: number): number {
  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new Error("amountCents must be a non-negative integer");
  }
  if (!Number.isInteger(bps) || bps < 0) {
    throw new Error("bps must be a non-negative integer");
  }
  return Math.round((amountCents * bps) / 10_000);
}

export function formatMoney(amountCents: number, currency: string): string {
  const factor = minorUnitsPerMajor(currency);
  const decimals = factor === 1 ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amountCents / factor);
}

/**
 * Convert minor units between currencies using an explicit rate snapshot.
 * rateToBase = units of that currency per 1 base unit (e.g. KES 129 = 1 USD).
 */
export function convertCents(
  amountCents: number,
  fromRateToBase: number,
  toRateToBase: number,
): number {
  if (fromRateToBase <= 0 || toRateToBase <= 0) {
    throw new Error("Currency rates must be positive");
  }
  return Math.round((amountCents / fromRateToBase) * toRateToBase);
}
