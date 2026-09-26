# Payments (Phase 7)

## Architecture

Business logic talks only to `PaymentProvider` (`server/payments/providers.ts`):
`createPayment`, `getTransactionStatus`, `verifyWebhookSignature`,
`parseWebhookEvent`, `refundPayment`. Vendors slot in behind the interface.

- **mock**: deterministic test double (programmable succeed/fail/hang,
  HMAC-signed webhooks). The only active provider until real credentials exist.
- **mpesa** / **card**: adapter shells that fail closed without credentials
  (`MPESA_*`, `CARD_PROCESSOR_*`). No production money moves until keys are
  supplied — `getProvider` throws otherwise.

## Source of truth

The provider webhook is authoritative. The browser is never proof of
payment. Every callback is signature-verified, parsed, then applied
idempotently: duplicate deliveries, delayed callbacks and unknown
transactions are all safe.

## Records

- `Payment` (kind `DEPOSIT`/`BALANCE`/`FULL`, status machine
  `PENDING → SUCCEEDED|FAILED|CANCELLED`, `REFUNDED` when fully refunded).
- `PaymentAttempt` — every try (initiated, timeout, retried, succeeded…).
- `Refund` — partial or full, idempotent, decrements `booking.paidCents`.
- `AuditLog` entries for created/succeeded/failed/refunded.

Money stays integer minor units; no card data is ever stored or logged.

## Booking integration

Payable states: `HOLD`, `AWAITING_DEPOSIT`, `CONFIRMED`, `PRE_TRIP`.
Amounts may never exceed the outstanding balance. When cumulative payments
cover the deposit, the booking auto-confirms (holds consumed). Payments
arriving after expiry/cancellation are rejected and the payment is marked
`CANCELLED`. Receipts (`GET /api/payments/[id]/receipt`) exist only for
succeeded payments.

## Guest flow

`POST /api/payments` with `bookingId` + booking `email` (ownership proof),
then the provider confirms asynchronously via
`POST /api/payments/webhook/[provider]`. Timeouts surface as 504 with the
payment left `PENDING`; `POST /api/payments/[id]/retry` (or `reconcile`)
recovers without double-charging thanks to idempotency keys.
