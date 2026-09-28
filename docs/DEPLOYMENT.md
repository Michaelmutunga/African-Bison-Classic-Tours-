# Deployment (Phase 15)

Target: **Railway** — one web service (Dockerfile build from GitHub) plus
**managed PostgreSQL**. No other services are required; Redis, queues and
workers were never introduced (in-memory throttle + on-request sweeps only).

## Why there is no `railway.toml`

Validated against the Railway docs on 2026-09-28: Config as Code
(`railway.toml` / `railway.json`) is **deprecated**, stops working on
**2026-12-01**, and new services cannot opt into it. Per the project rule
("`railway.toml` or equivalent only after validating current Railway
schema"), the equivalent is dashboard service settings, listed below.
Nothing is lost: Railway auto-detects the root `Dockerfile`.

## Railway service settings

| Setting          | Value                                              |
| ---------------- | -------------------------------------------------- |
| Builder          | `DOCKERFILE` (auto-detected from repo root)        |
| Start command    | _(default — image `CMD`: `node server.js`)_        |
| Healthcheck path | `/api/health`                                      |
| Healthcheck timeout | `300`                                           |
| Restart policy   | `ALWAYS`, max retries `10`                         |
| Postgres         | Add the **Postgres** plugin (managed, not a container) |

Deploys trigger automatically on pushes to `main`.

## Environment variables (Railway → service → Variables)

| Variable               | Value / source                                              |
| ---------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`         | `${{Postgres.DATABASE_URL}}?schema=public` (service reference) |
| `NODE_ENV`             | `production`                                                |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-railway-domain>`                             |
| `RESEND_API_KEY`       | _optional_ — without it, emails record FAILED, nothing breaks |
| `RESEND_FROM`          | _optional, with the key above_                              |
| `MOCK_PROVIDER_SECRET` | **required** — `openssl rand -hex 32` (mock webhook signer) |
| `ADMIN_*`              | _not needed on Railway_ — bootstrap locally (below)         |

Never commit real values. `.env.example` documents the same contract.

## Database migrations (explicit, never automatic)

The production image intentionally contains **no migration runner**, so no
deploy can ever reset or migrate destructively on its own:

```bash
# From a trusted machine with the managed connection string:
DATABASE_URL="<managed-postgres-url>?schema=public" npm run db:migrate:deploy
```

- `db:migrate:deploy` = `prisma migrate deploy` (applies pending, never resets).
- `db:reset` / `prisma migrate dev` are **forbidden** against production.
- Verify: `GET /api/health` reports `"database": "connected"`.

## Seed policy

`npm run db:seed` loads catalogue content **and clearly-marked demo
records**. Run it for local development only. **Never seed production** —
real vehicles, guides, rates and content are entered in `/admin`.

## First admin (production)

```bash
# Locally, targeting the managed database (one-off, secrets stay local):
DATABASE_URL="<managed-postgres-url>?schema=public" \
ADMIN_EMAIL="ops@africanbisonclassictours.com" \
ADMIN_PASSWORD="<12+ char secret>" \
ADMIN_NAME="Ops" npm run create-admin
```

## Local Docker verification (mirrors production)

```bash
npm run docker:build
docker compose up -d db
npm run db:migrate:deploy   # against the local DATABASE_URL
docker compose up app       # production server on :3000
curl http://localhost:3000/api/health  # {"status":"ok","database":"connected"}
```

`docker-compose.yml` runs Postgres 16 plus the production image; the `app`
service is the exact artifact Railway builds.

## Rollback and ops

- Roll back from the Railway deployment history (previous image + explicit
  re-run of migrations is never needed for rollback — migrations are
  additive; check `prisma/migrations` before rolling back across one).
- Logs: Railway service logs; request IDs are logged server-side for
  correlation (`AUDIT` entries carry actor/action/resource).
- The maintenance sweep (`POST /api/admin/maintenance/sweep`, staff-only)
  should be called on a schedule (Railway cron or external scheduler) for
  hold expiry, quote expiry and customer reminders — repeats are dedupe-safe.

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| Healthcheck fails at deploy | `DATABASE_URL` wrong / Postgres plugin not attached |
| `MOCK_PROVIDER_SECRET is required` | Variable missing in production env |
| Pages render but emails never send | `RESEND_*` unset — by design, rows record FAILED |
| Migration P3005 / drift | Someone edited the managed DB directly — baseline with `prisma migrate resolve` after review |
