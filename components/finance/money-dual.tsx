import { convertCents, formatMoney } from "@/lib/money";

export type RateInfo = { rateToBase: number; asOf: string } | null;

/**
 * Display-only dual money line. Primary is always the record currency;
 * the secondary approximation is labelled indicative with rate + date.
 * Never use this to rewrite stored totals.
 */
export function MoneyDual({
  amountCents,
  currency,
  displayCurrency,
  rate,
  baseCurrency = "USD",
}: {
  amountCents: number;
  currency: string;
  displayCurrency: string;
  rate: RateInfo;
  baseCurrency?: string;
}) {
  const primary = formatMoney(amountCents, currency);
  if (displayCurrency === currency || !rate) {
    return <span className="type-numeric">{primary}</span>;
  }
  // Rates are stored as units per 1 base unit. Convert via base.
  const fromRate = currency === baseCurrency ? 1 : null;
  const toRate = displayCurrency === baseCurrency ? 1 : rate.rateToBase;
  if (fromRate === null) {
    // Non-base source without its own rate: show primary only to avoid guessing.
    return <span className="type-numeric">{primary}</span>;
  }
  const converted = convertCents(amountCents, fromRate, toRate);
  const asOf = new Date(rate.asOf).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <span>
      <span className="type-numeric">{primary}</span>{" "}
      <span className="type-caption text-ink/60">
        ≈ {formatMoney(converted, displayCurrency)} · indicative at {asOf}
      </span>
    </span>
  );
}

/** One-line rate caption for headers and settings. */
export function rateCaption(rateToBase: number | null, asOf: string | null): string | null {
  if (rateToBase === null || rateToBase === undefined) return null;
  if (!asOf) return `1 USD = ${rateToBase} KES`;
  const date = new Date(asOf).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `1 USD = ${rateToBase} KES · ${date}`;
}
