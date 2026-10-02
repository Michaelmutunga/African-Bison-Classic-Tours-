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

---

# Marketplace pricing engine (Phase 3, `server/marketplace-pricing.ts`)

The middleman model: ABCT pays suppliers cost, charges clients cost +
markup, keeps the difference. **All pricing math lives in one pure module —
never in UI components.**

## Line order of operations

1. Scale cost: per-person units (`PER_PERSON_PER_NIGHT`, `PER_ACTIVITY`)
   multiply unit cost × quantity × pax; vehicle/group/transfer units ignore
   pax (`scaleLineCost`).
2. Convert to the booking currency at the recorded FX rate (`CurrencyRate`
   snapshot stored per line).
3. Apply markup by priority: **line override → supplier → service type →
   global default** (`MarkupRule` table; global seed is 25%).
4. Round the client price to `pricing.roundingIncrementCents` (half up).

## Booking order

Sum lines → booking discount (clamped to subtotal) → taxes (percent on the
discounted subtotal, fixed added flat, listed separately) → total → 30%
deposit. Taxes are **never** hidden inside markup.

## Markup % vs margin %

Both are computed per line and booking-wide: markup % = markup / cost,
margin % = income / client price. A 25% markup is a 20% margin.

## Money trail

`ServiceLine` rows store supplier cost, applied rule (+ source and rule id),
client price, income, currency and FX snapshot (derived ref
`{bookingRef}-Sn`). Booking rows carry **no** cost fields, so client
payloads can never leak them — totals come from `bookingPricingSummary`.
Rate changes never move existing lines (they pin the costed values).
