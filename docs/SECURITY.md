# Security (Phase 14 hardening pass)

Threat model: a public booking platform holding customer contact details,
traveller passport data and payment references. The posture below is
enforced in code and pinned by `tests/security.test.ts` — not by convention.

## Transport and headers

- `Strict-Transport-Security` (2 years, subdomains) behind Railway TLS;
  ignored over plain HTTP in local dev.
- `Content-Security-Policy`: same-origin everything; `object-src 'none'`,
  `frame-ancestors 'none'`, no third-party scripts/trackers/embeds
  allowlisted. `script-src`/`style-src` keep `'unsafe-inline'` because App
  Router embeds Flight data inline and React sets inline style attributes.
  Contract lives in `lib/security-headers.ts` (unit-tested).
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, restrictive
  `Permissions-Policy`, no `X-Powered-By`.

## Authentication and sessions

- bcrypt (cost 12) via `bcryptjs`; identical passwords salt differently.
- Sessions are 256-bit random tokens, sha256-hashed at rest, 7-day TTL,
  transmitted in `httpOnly; SameSite=Lax` cookies (`Secure` in production).
  A fresh token is minted on every login — no fixation.
- Expired sessions and deactivated users resolve to nothing; failed
  lookups clean up.
- Login returns an identical `invalid_credentials` 401 for unknown email
  vs wrong password (no enumeration), and is throttled per IP
  (20 / 10 min). Registration is throttled (10 / hour).

## Authorization

- Explicit RBAC matrix in `lib/permissions.ts`, enforced server-side in
  every API route and server function — never by hiding UI buttons.
- Customer data is owner-scoped by user id or account email; other
  people's bookings resolve to 404 so existence never leaks
  (`server/portal.ts`, concierge retrieval).
- Staff-only records (internal notes, audit log, other customers' PII)
  have no customer-facing read path.

## Input handling and injection

- Zod validation on every public boundary; consistent 422 envelopes.
- Prisma parameterization throughout — no raw SQL string building, so
  SQL-injection payloads die at validation.
- React escapes by default; the hand-built email templates escape every
  interpolated value (`escapeHtml`, pinned by test).
- Public forms carry a honeypot (`company`) that fakes success for bots;
  inquiries are throttled (10 / hour / IP).

## Payments

- Raw card numbers/CVV are never stored or logged — only provider refs.
- Webhook signatures verified with timing-safe HMAC comparison before any
  state change; missing/forged signatures get 401 with zero side effects.
- Webhook application is idempotent (duplicate delivery is harmless).
- `MOCK_PROVIDER_SECRET` (and all production provider keys) come from the
  environment; production refuses to boot the mock signer without one.
- Secrets never ship in the image, the repo, or logs. `.env` is git-ignored;
  `.env.example` documents every required variable with empty values.

## Abuse and concurrency

- Per-IP throttles: login, register, bookings, payments, inquiries,
  concierge (see each route for limits; single-instance in-memory, a
  distributed limiter is the documented next step for multi-instance).
- Double-booking is prevented at the database layer: advisory-lock
  serialized holds, overlap rejection on assignments, unique constraints
  plus idempotency keys on bookings/payments/refunds. Pinned by
  concurrent-attempt tests in `bookings.test.ts` and `operations.test.ts`.

## Errors and observability

- `server/http.ts` maps known errors to status codes; unknown errors
  return generic `internal_error` 500s — stack traces and Prisma details
  never reach the browser. `app/global-error.tsx` / `app/not-found.tsx`
  give calm recovery pages.
- `AuditLog` records actor/action/resource for booking, pricing, payment,
  operations and content mutations. Audit entries never contain secrets,
  card data or passport numbers.

## Residual risks (accepted, tracked)

- In-memory throttles don't share state across instances.
- CSP keeps `'unsafe-inline'` for scripts/styles (App Router requirement).
- WhatsApp/SMS channels fail closed until business credentials exist.
- Production provider adapters (M-Pesa/card) are fail-closed stubs until
  live keys are supplied.
