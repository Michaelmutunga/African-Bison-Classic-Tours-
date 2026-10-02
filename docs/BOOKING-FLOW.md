# Booking flow (marketplace workflow, Phase 6)

## Lifecycle

```
NEW → IN_REVIEW → SUPPLIERS_PENDING → QUOTE_DRAFT → QUOTE_APPROVED
→ QUOTE_SENT → (CLIENT_REVISION ↩ QUOTE_DRAFT) → AWAITING_PAYMENT
→ PARTIALLY_PAID → CONFIRMED → IN_PROGRESS → COMPLETED
```

Side exits: `CANCELLED` (from any pre-travel state — releases holds and
supplier locks), `EXPIRED` (re-enterable at `NEW`), `REFUND_PENDING →
REFUNDED` (cancelled after payment).

Legacy rows were remapped with their history intact (`INQUIRY→NEW`,
`HOLD→SUPPLIERS_PENDING`, `AWAITING_DEPOSIT→AWAITING_PAYMENT`,
`PRE_TRIP→CONFIRMED`, `ON_SAFARI→IN_PROGRESS`); retired enum values are
gone from the schema. The migration is reversible via the history table.

Every transition is validated against `TRANSITIONS` (`server/bookings.ts`)
and recorded in `BookingStatusHistory` with actor, reason and timestamp.
Illegal transitions throw — there is no back door.

## Workflow automation (`server/workflow.ts`)

1. **Propose** (`POST …/propose-lines`): the request auto-parses into
   service lines (transfers, stays per destination, driver-guide) with
   suggested suppliers; `NEW → IN_REVIEW`.
2. **Request** (`POST …/request-suppliers`): supplier locks go `REQUESTED`
   and each supplier gets an email with a single-purpose tokenized link
   (`/supplier-response/[token]`, no login) to **accept → HELD**,
   **decline → DECLINED**, or **counter** (stays requested, offer recorded).
   Every reply notifies staff. `→ SUPPLIERS_PENDING`.
3. **Draft** (`POST …/quote-draft`): requires every line HELD/CONFIRMED.
   Client-safe snapshot (names, quantities, client prices — no suppliers,
   costs or markup), taxes, validity, terms. Derived ref `{ref}-Qn`.
4. **Edit** (`POST …/quotes`): every save mints a new version with a diff
   (added/removed/changed lines, totals). Line changes happen on service
   lines, then regenerate.
5. **Approve → send** (`PATCH …/quotes`): `QUOTE_APPROVED → QUOTE_SENT`;
   the client sees it in their safari portal and by email.
6. **Client answers** (`/api/account/bookings/[ref]/quote`): accept sets
   booking totals from the version snapshot (`→ AWAITING_PAYMENT`); change
   requests return to `CLIENT_REVISION` with comments.
7. **Expiry** (sweep): lapsed versions expire; `SENT` expiries release HELD
   locks with a 48-hour admin warning beforehand.
8. **Payment** (webhook-verified, idempotent): deposit → `PARTIALLY_PAID`,
   full balance → `CONFIRMED` — locks flip `HELD → CONFIRMED`, payouts
   schedule as `DUE`, suppliers get confirmations, the client gets receipt
   + voucher, and the master calendar picks the dates up.
9. **Pre-trip** (sweep): 7-day client + supplier reminders, 24-hour
   supplier ping. **Post-trip**: `IN_PROGRESS → COMPLETED`, payouts stay
   `DUE` until finance settles; income is realised on the summary.

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
