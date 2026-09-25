# Booking flow (Phase 6)

## Lifecycle

```
INQUIRY → QUOTE_DRAFT → QUOTE_SENT → HOLD → AWAITING_DEPOSIT → CONFIRMED
→ PRE_TRIP → ON_SAFARI → COMPLETED
```

Side exits: `CANCELLED` (from any pre-travel state), `EXPIRED` (holds lapse
or quotes die), `REFUND_PENDING → REFUNDED` (cancelled after payment —
money movement is Phase 7). `EXPIRED` can re-enter at `INQUIRY`/`HOLD`.

Every transition is validated against `TRANSITIONS` (`server/bookings.ts`)
and recorded in `BookingStatusHistory` with actor, reason and timestamp.
Illegal transitions throw — there is no back door.

Side effects: entering `CONFIRMED` consumes active holds; entering
`CANCELLED`/`EXPIRED` releases them.

## Creation paths

1. **Guest checkout** (`POST /api/bookings`, throttled): name, email,
   tour, dates, party. Starts at `INQUIRY`.
2. **From accepted quote**: `quoteId` copies the commercial snapshot and
   totals, flips the quote to `CONVERTED`, starts at `AWAITING_DEPOSIT`
   when holds are attached, else `INQUIRY`.
3. **With holds**: each hold passes a locked availability check; any
   successful hold moves the booking to `HOLD`.
4. **Idempotent retries**: pass `idempotencyKey` — a retry returns the
   original booking instead of double-booking.

References look like `ABCT-2026-4F8K2D` (random, unique-retry).

## Holds and availability

A hold pins `(resourceType, resourceId, quantity)` over `[startsAt, endsAt)`
until `expiresAt`. Availability = capacity − overlapping `ACTIVE` +
`CONSUMED` holds. Creation serializes per resource via Postgres advisory
transaction locks, so concurrent requests cannot double-book.

Capacity is caller-supplied until capacity masters land (Phase 10:
vehicles, properties, guides). The overlap mechanism is final; only the
capacity source changes.

`POST /api/admin/maintenance/sweep` (or `sweepExpirations()`) expires
lapsed holds and bookings left in `HOLD` with no live holds. Renewals
extend `expiresAt` within 5 minutes – 14 days.

## Modification and cancellation

- Modifiable in `INQUIRY`/`HOLD`/`AWAITING_DEPOSIT`. Date changes release
  holds (they pin the old window) so staff re-hold against live stock.
- Cancellable until `PRE_TRIP`. Paid bookings cancel into
  `REFUND_PENDING`; unpaid into `CANCELLED`. Holds always release.
- Guests look up by reference + email (`GET /api/bookings/lookup`) and can
  cancel with their email as proof. Full modification stays staff-side
  until the customer portal (Phase 8).
