# API reference

All routes live under `app/api/**/route.ts`. Every input is Zod-validated;
business logic lives in `server/*`, never in the route files.

## Envelope

Success: `{ ok: true, … }` (reads) or `201` + resource (writes).

Errors (no stack traces in production):

| Status | `code` | Meaning |
| ------ | ------ | ------- |
| 400 | `invalid_json` | Body is not JSON |
| 401 | `unauthorized` / `invalid_signature` | No session / bad webhook signature |
| 403 | `forbidden` | Session lacks the permission |
| 404 | `not_found` | Missing — or not yours (existence never leaks) |
| 409 | `conflict` | Slug clash, overlap, double allocation |
| 422 | `validation_error` / `pricing_error` | Field details / business rule |
| 429 | `rate_limited` | Per-IP throttle (login, register, bookings, payments, inquiries, concierge) |
| 500 | `internal_error` | Generic — detail in server logs only |
| 504 | `provider_timeout` | Payment provider hung |

Auth is a `bison_session` httpOnly cookie (`SameSite=Lax`, `Secure` in
production). Public `GET`s need nothing; staff routes require the
permission in `lib/permissions.ts`, enforced server-side.

## Public

- `GET /api/health` — `{ status, database, time }`; 503 when DB unreachable
- `POST /api/auth/login|logout` · `GET /api/auth/me`
- `POST /api/inquiries` — contact/builder/custom requests (honeypot + throttle)
- `POST /api/bookings` — guest reservation (idempotent, throttled)
- `GET /api/bookings/lookup?reference=&email=` · `POST /api/bookings/[id]/cancel`
- `GET /api/invites/[token]` — group traveller invitation (token-gated)
- `POST /api/concierge` — controlled assistant, anonymous scope allowed

## Customer (`/api/account/*`, session required, owner-scoped)

- `POST /api/account/register` — self-registration + guest-booking claim
- `GET /api/account/bookings` · `GET /api/account/bookings/[reference]`
  (workspace: itinerary, travellers, payments, documents, messages, group)
- `.../travellers`, `.../messages`, `.../documents`, `.../group`,
  `.../group/invites` (organiser aggregates only)
- `GET|PATCH /api/account/travellers/[id]` · `POST /api/account/password`
- `GET /api/account/notifications` · `GET /api/account/invites/[id]`

## Operations (`/api/admin/*`, staff session + permission)

Catalogue: `destinations`, `tours`, `categories`, `addons`, `activities`,
`accommodations`, `seasons`, `rate-cards`, `price-components`,
`currency-rates`, `promo-codes`, `faqs`, `posts`, `media`, `settings`.
Reservations: `bookings`, `bookings/[id]` (+ `messages`, `documents`,
`notes`, `group`), `holds`, `travellers`, `inquiries`, `quotes`,
`invoices`, `payments` (+ `[id]/refund`), `vehicles` (+ `assign`),
`guides` (+ `assign`), `assignments/[id]`, `transfers`, `calendar`,
`dashboard`, `notifications`, `audit-logs`, `maintenance/sweep`.

## Payments (`/api/payments/*`)

- `POST /api/payments` — initiate (throttled) · `GET /api/payments/[id]`
  (owner/staff) · `.../receipt` · `.../retry`
- `POST /api/payments/webhook/[provider]` — HMAC-verified, idempotent;
  the provider is authoritative, the browser never is.

Idempotency: bookings, payments and refunds accept idempotency keys;
retries with the same key return the original record.
