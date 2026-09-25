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
