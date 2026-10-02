# Admin guide (Phase 3 catalogue)

## Staff access

1. Create a staff user (12+ character password, dev only):
   `ADMIN_EMAIL="ops@example.com" ADMIN_PASSWORD="..." ADMIN_NAME="Ops" npm run create-admin`
   Optional: append `--role=CONTENT_MANAGER` (default `ADMIN`).
2. Sign in at `/login`. Sessions last 7 days via an httpOnly cookie.
3. Open `/admin/tours`.

Roles: `SUPER_ADMIN`, `ADMIN`, `CONTENT_MANAGER` (write + publish),
`SAFARI_CONSULTANT`, `RESERVATION_STAFF`, `OPERATIONS_MANAGER`,
`FINANCE_USER` (read-only catalogue), `CUSTOMER`.

## Operations console (Phase 10)

- `/admin` — dashboard with real counts; pipeline links filter `/admin/bookings`.
- `/admin/bookings` — pipeline board; `/admin/bookings/[id]` — full workspace.
- `/admin/calendar?month=N` — bookings, transfers, holds with conflict flags.
- `/admin/fleet` — vehicles and guides (delete blocked while assigned).
- `/admin/transfers`, `/admin/travellers`, `/admin/quotes`, `/admin/invoices`,
  `/admin/payments`, `/admin/inquiries`, `/admin/notifications`,
  `/admin/audit-logs`.
- `/admin/notifications` — idempotent outbox log (email + in-app sent,
  WhatsApp/SMS fail closed until connected). Trip-start, balance and
  hold-expiring reminders run from `POST /api/admin/maintenance/sweep`,
  which a scheduler should call (repeats are dedupe-safe).
- Assignments reject overlaps with 409 naming the clashing booking; the
  calendar independently flags any that slip through.
- No demo fleet is seeded — create the real vehicles and guides here.

## Booking workspace (marketplace Phase 5)

- `/admin` — “Needs action” counters (new requests, quotes awaiting answer,
  supplier replies pending, overdue deposits, trips starting within 14 days).
- `/admin/bookings/[id]` — single-screen workspace: header (reference,
  status, age, owner, priority, next action), client + past bookings, trip
  request, costed service lines with margin, supplier suggestions for
  unassigned lines, supplier locks, quote + live pricing totals, payment
  schedule vs received, transfers, travellers, documents, client thread,
  internal notes, merged timeline.
- Assign an owner + priority from the header; unassigned and urgent surface
  first in the pipeline (priority-ordered).
- Service lines re-price on every edit against live markup rules; money
  fields are never hand-edited. Removing a line is audit-logged.
- Supplier assignment picks a suggested rate (cheapest first, capacity
  checked); availability requests and lock lifecycles arrive in Phase 6.

## Catalogue workflow

- Tours are created as **drafts** (`published: false`).
- Publishing is a separate step requiring `catalogue.publish`.
- Public pages only ever render `published` tours and destinations.
- Slugs auto-generate from titles and stay unique (`name`, `name-2`, …).
- Renaming a tour regenerates its slug unless an explicit slug is given.
- Itinerary days save transactionally (all-or-nothing per update).
- Deleting a tour deletes its days (cascade).

## API

All `/api/admin/*` routes require a staff session and enforce permissions
server-side (`lib/permissions.ts`). Anonymous writes return 401, unpermitted
roles return 403, bad input returns 422 with field details, slug clashes
return 409.

## Local database notes

This machine already runs Postgres on 5432/5433, so the local `.env`
uses host port **5434** (`POSTGRES_HOST_PORT`). If the container reports
healthy but is unreachable, restart it: `docker compose restart db`
(stale Docker Desktop port forwarding).
