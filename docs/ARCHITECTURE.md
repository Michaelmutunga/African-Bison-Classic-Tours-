# Architecture (Phase 0)

Modular monolith. Next.js App Router hosts public site, customer app,
admin console and API routes in one deployable unit.

```text
/app            routes (public, account, admin, api)
/components     shared UI primitives
/features       domain modules (tours, booking, payments, ...)
... (truncated 911 chars)
