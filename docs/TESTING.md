# Testing (Phase 3)

## Suites

| Command | Scope |
|---|---|
| `npm run test` | Vitest unit + integration (jsdom components, node services) |
| `npx vitest run <file>` | Single file |
| `npm run test:e2e` | Playwright Chromium (dev server + local DB) |

## Test database

Integration tests (`tests/auth.test.ts`, `server/catalogue.test.ts`) run
against an isolated `bison_test` database, provisioned by
`tests/global-setup.ts` (create + `migrate deploy`). The shared Prisma
client (`lib/prisma.ts`) points at `TEST_DATABASE_URL` only when
`NODE_ENV=test` (set by Vitest). Development data is never touched.

## E2E fixtures

`e2e/global-setup.ts` upserts two clearly-fake staff accounts into the
**development** database (`phase3-e2e-admin@`, `phase3-e2e-consultant@`).
Phase 3 specs exercise real HTTP: 401 anonymous, 403 wrong role, full
tour draft → publish → public → delete lifecycle, UI sign-in, and the
public catalogue.

## Interactive caveats (slow dev server)

First-visit route compiles are slow on this machine, and client components
hydrate seconds after first paint. E2E clicks on forms wait for an explicit
hydration marker (`form[data-ready="true"]`, set via ref callback) —
pre-hydration clicks natively reload the page instead of running handlers.
