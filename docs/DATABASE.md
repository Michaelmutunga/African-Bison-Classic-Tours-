# Database (Phase 0)

- Local: PostgreSQL 16 via `docker-compose.yml` (`db` service).
- Test: separate database or disposable container (to be wired in Phase 6).
- Production: Railway managed PostgreSQL (Phase 15).

Migrations are Prisma-based. Never run destructive resets against production.

## Phase 3 catalogue model

- `User`, `Session` (bcrypt + httpOnly cookie sessions, 7-day TTL).
- `Destination`, `TourCategory`, `TourProduct` (M2M destinations),
  `ItineraryDay` (unique per tour + day number, cascade delete),
  `Activity`, `Accommodation` (+ `AccommodationRoomType`), `TourAddOn`,
  `Season`, `PriceComponent` (money as integer minor units + currency).
- Unique slugs on every catalogue entity; indexes on
  `(published)`, `(categoryId, published)`, `(tourId, dayNumber)`.

Public reads are published-only. Catalogue pages are `force-dynamic`
because Docker/CI builds have no database at build time
(`generateStaticParams` degrades to `[]` instead of failing).

## Test database

`bison_test` (same host) is provisioned by `tests/global-setup.ts`.
`lib/prisma.ts` points at `TEST_DATABASE_URL` only when
`NODE_ENV=test`. E2E uses the development database with clearly-marked
fixture accounts (`phase3-e2e-*@example.com`).
