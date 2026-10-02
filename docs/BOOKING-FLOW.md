# Booking flow (Phase 6, marketplace track from Phase 4)

## Lifecycle

```
NEW → QUOTE_DRAFT → QUOTE_SENT → HOLD → AWAITING_DEPOSIT → CONFIRMED
→ PRE_TRIP → ON_SAFARI → COMPLETED
```

`NEW` is the marketplace entry state (every submission starts here with a
dated `ABCT-YYYY-MM-DD-NNN` reference). Legacy `INQUIRY` rows keep their
state and mirror `NEW`'s exits until the Phase 6 workflow migrates them
with history rows.

Side exits: `CANCELLED` (from any pre-travel state), `EXPIRED` (holds lapse
or quotes die), `REFUND_PENDING → REFUNDED` (cancelled after payment —
money movement is Phase 7). `EXPIRED` can re-enter at `INQUIRY`/`HOLD`.

Every transition is validated against `TRANSITIONS` (`server/bookings.ts`)
and recorded in `BookingStatusHistory` with actor, reason and timestamp.
Illegal transitions throw — there is no back door.

Side effects: entering `CONFIRMED` consumes active holds; entering
`CANCELLED`/`EXPIRED` releases them.

## Creation paths (marketplace submissions, Phase 4)

1. **Listed tour** (`POST /api/submissions` or `/request?tour=`, throttled,
   honeypot-guarded): contact, nationality, dates (+flexible flag),
   adults/children + ages, flights, tier, budget, interests, occasion,
   pickup, channel, special requests. Starts at `NEW`.
2. **Custom design** (same endpoint with `source: CUSTOM`, or the builder's
   “Request precise quote”): needs `customItinerary.destinations` or 10+
   characters of notes. Starts at `NEW`, parsed into service lines in Phase 6.
3. **From accepted quote**: `quoteId` copies the commercial snapshot and
   totals, flips the quote to `CONVERTED`, starts at `AWAITING_DEPOSIT`
   when holds are attached, else `NEW`.
4. **With holds**: each hold passes a locked availability check; any
   successful hold moves the booking to `HOLD`.
5. **Idempotent retries**: pass `idempotencyKey` — a retry returns the
   original booking and re-notifications collapse via dedupe keys.

On submit the client gets a confirmation email with the reference and the
staff get an in-app + email alert (plus WhatsApp when `WHATSAPP_HOOK_URL`
is set). Logged-in customers link automatically; guests stay email-linked
and are claimed by the existing register flow — no auto-passwords.

References look like `ABCT-2026-10-01-001` (per-day Nairobi counter).

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

- Modifiable in `NEW`/`INQUIRY`/`HOLD`/`AWAITING_DEPOSIT`. Date changes release
  holds (they pin the old window) so staff re-hold against live stock.
- Cancellable until `PRE_TRIP`. Paid bookings cancel into
  `REFUND_PENDING`; unpaid into `CANCELLED`. Holds always release.
- Guests look up by reference + email (`GET /api/bookings/lookup`) and can
  cancel with their email as proof. Full modification stays staff-side
  until the customer portal (Phase 8).
