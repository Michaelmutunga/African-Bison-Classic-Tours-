# African Bison Classic Tours

Premium East African safari planning and reservation platform.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Prisma + PostgreSQL + Zod.
Tests: Vitest (unit) + Playwright (e2e).

## Local development

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Health: `GET /api/health`

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Unit tests |
| `npm run test:e2e` | Browser e2e tests |
| `npm run db:migrate` | Run Prisma migrations (dev) |
| `npm run db:seed` | Seed business settings + catalogue |
| `npm run db:check` | Verify database connectivity |
| `npm run create-admin` | Admin bootstrap placeholder |

## Phases

See `Agents.md`. Current status: **Phase 12 notifications and communication**.

## Notifications

Event-driven email + in-app notifications with an idempotent outbox log.
Ten branded templates, a Resend adapter (active only with credentials, log
fallback in development), and WhatsApp/SMS boundaries that fail closed.
Trip-start and balance reminders run from the maintenance sweep. See
`/admin/notifications` and the customer dashboard feed.

## Content studio (`/admin`)

Journal posts with draft/scheduled/published/archived states, scheduled
auto-publishing, FAQ manager with ordering, media registry with alt-text
and attribution requirements, site settings without code deploys, and SEO
title/description overrides on tours, destinations and posts. The public
journal, FAQ and SEO metadata all render from the database.

## Operations console (`/admin`)

Real database-backed dashboard (arrivals, departures, transfers,
fleet/crew utilization, pipeline, revenue, outstanding), booking pipeline
and per-booking workspace (status, crew/fleet assignment with conflict
rejection, transfers, travellers, payments/refunds, invoices, messages,
internal notes, documents, history), resource-aware month calendar with
conflict flags, fleet and guide management, transfers, quotes, invoices,
payments, travellers, enquiries, audit log, and a drag-and-drop itinerary
editor. Every mutation is permission-gated server-side and audited.

## Group travel

One group per booking. The organiser names the group and invites
travellers by email; each traveller completes a private token-gated form
(passport, emergency, dietary, room preference) that nobody else can see.
Organisers track completion aggregates and rooming info — never passport
or medical contents. Staff can invite and view the same dashboard.

## Customer portal

Self-registration with guest-booking claim, role-aware sign-in,
`/dashboard`, `/my-safaris`, `/safari/[reference]` workspace (journey,
travellers, payments, documents, messages tabs), pre-trip checklist,
safari passport, in-trip today view, printable confirmation and
itinerary, profile with password change. Owners see only their own
bookings — isolation enforced server-side (404, never 403).

## Payments

Provider abstraction (`mock` active; M-Pesa/card adapters fail closed
without credentials). Webhooks are signature-verified and idempotent —
the browser is never proof of payment. Deposits auto-confirm bookings,
refunds (full/partial, idempotent) decrement paid totals, receipts issue
for successes. No card data stored. See `docs/PAYMENTS.md`.

## Reservations

Explicit booking state machine (`INQUIRY … COMPLETED`, plus
`CANCELLED`/`EXPIRED`/`REFUND_PENDING`/`REFUNDED`) with every transition
validated and recorded. Temporary holds pin inventory with
per-resource advisory-lock serialization, expiry sweeps, renewals and
release on cancel. Guest checkout with `ABCT-2026-XXXXXX` references and
idempotency keys; accepted quotes convert with their snapshot. See
`docs/BOOKING-FLOW.md`.

## Pricing

Integer minor units everywhere, basis-point percentages, children at 50%,
30% deposits. Seasonal multipliers, per-person/per-group components,
promo codes, multi-currency with rate snapshots. Every quote persists an
immutable commercial snapshot and a 14-day default validity. Seeded rates
are flagged illustrative placeholders — see `docs/PRICING.md`.

## Safari builder

Ten guided steps (regions → experiences → dates → travellers → style →
interests → destinations → stay → transport → activities) produce a
day-by-day plan with a route schematic and journey profile. Drafts persist
in the browser; “Request precise quote” sends the plan to a planner as a
tracked inquiry with structured metadata. No prices are shown — monetary
quotation is Phase 5.

## Design system

Tokens and type scale live in `app/globals.css` (Tailwind v4 `@theme`).
Accessible primitives live in `components/ui/`. Site chrome in
`components/site-header.tsx` / `components/site-footer.tsx`.
Palette: ink, ivory, parchment, sand, earth, bark, clay. Type: Fraunces
(display) + Inter (body).
