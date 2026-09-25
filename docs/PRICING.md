# Pricing and quotations (Phase 5)

## Money rules

- All amounts are **integer minor units** (`amountCents`). No floats anywhere.
- Percentages are **basis points** with a single `Math.round` per line
  (`lib/money.ts`: `applyBps`).
- Children (2–11) pay **50%** of the adult base rate (`CHILD_RATE_BPS`).
  Infants are free. Park fees and add-ons charge children at full rate
  until per-entity child pricing lands.
- KES is stored as whole shillings (zero-decimal convention).

## How a quote is built (`server/pricing.ts`)

1. **Base rate**: `RateCard` by (comfort tier + transport) → comfort-only
   fallback. Per person per day × trip days. Fails loudly when unconfigured.
2. **Season**: seasons overlapping the trip dates; the highest
   `multiplierBps` adjusts the base subtotal only.
3. **Accommodation**: planner-entered per-night rate × (`days − 1`) nights ×
   rooms (default `ceil(adults / 2)`).
4. **Park fees**: `PriceComponent` (`kind = park_fee`) linked to the tour's
   destinations × days × (adults + children).
5. **Transport**: per-person components × days × persons; group components ×
   days. **Transfers**: × 2 (arrival + departure).
6. **Add-ons**: priced ones × persons; unpriced ones appear as
   “priced on request” zero lines.
7. **Discounts**: promo code (percent or fixed, validity + usage limits) then
   manual fixed and/or percent. Discounts never exceed the subtotal.
8. **Currency**: converted from each component's currency into the quote
   currency using stored `CurrencyRate` values. Base currency is USD.
9. **Deposit**: 30% of total (`DEPOSIT_BPS`).

## Snapshots and history

Every quote persists an immutable `snapshot`: inputs, resolved season,
rate card, currency rates (value + timestamp), lines and totals
(`ENGINE_VERSION`). Historical quotes never recalculate — changing a rate
today does not move yesterday's totals.

## Quote lifecycle

`DRAFT → SENT → ACCEPTED → CONVERTED`, with `DRAFT/SENT → EXPIRED`.
Transitions outside this graph are rejected. `expireQuotes()` flips due
quotes; the admin list runs it opportunistically. Default validity is
14 days.

## Placeholder rates

Seeded rates and fees are **illustrative placeholders** (`placeholder: true`)
for development. Quotes using them carry `hasPlaceholderRates: true` and
must be labelled indicative. Replace them via `/api/admin/rate-cards`,
`/api/admin/price-components`, seasons and currency rates before selling.
