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
| `npm run db:seed` | Seed business settings |
| `npm run create-admin` | Admin bootstrap placeholder |

## Phases

See `Agents.md`. Current status: **Phase 2 public website and content**.

## Design system

Tokens and type scale live in `app/globals.css` (Tailwind v4 `@theme`).
Accessible primitives live in `components/ui/`. Site chrome in
`components/site-header.tsx` / `components/site-footer.tsx`.
Palette: ink, ivory, parchment, sand, earth, bark, clay. Type: Fraunces
(display) + Inter (body).
