# Database (Phase 0)

- Local: PostgreSQL 16 via `docker-compose.yml` (`db` service).
- Test: separate database or disposable container (to be wired in Phase 6).
- Production: Railway managed PostgreSQL (Phase 15).

Migrations are Prisma-based. Never run destructive resets against production.
Phase 0 schema contains only `SiteSetting` and `AuditLog`; the booking
domain lands from Phase 3 onwards.
