# User Guide — test the whole platform end to end

A hands-on script for clicking through the entire African Bison Classic
Tours platform: public site → builder → quote → reservation → payment →
customer portal → group travel → operations → content → concierge. Follow
it top to bottom to simulate one complete customer journey plus the staff
work around it.

## 0. Start the app

```bash
cp .env.example .env        # once; never commit real secrets
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed             # catalogue + demo data (dev only, never in prod)
npm run dev                 # http://localhost:3000
```

Sanity: `GET http://localhost:3000/api/health` → `{"status":"ok","database":"connected"}`.

Seeded locally right now: 44 published tours, 16 destinations, 8 FAQs,
9 vehicles. Bookings you see beyond your own are e2e leftovers — ignore them.

> Throttle note: login (20/10 min), registration (10/hour) and several
> write routes are per-IP throttled **in memory**. When simulating many
> users, use a handful of accounts or restart `npm run dev` to reset.
> Password hashing (bcrypt-12) is slow under load — waits of several
> seconds after login/register are normal, not hangs.

## 1. Accounts — access every dashboard

**Staff (do this first — you need ADMIN for everything below):**

```bash
ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="<12+ chars>" ADMIN_NAME="You" npm run create-admin
```

One account per role to test permissions (same command + `--role=`):

| Role | Sees |
| ---- | ---- |
| `ADMIN` / `SUPER_ADMIN` | Everything |
| `CONTENT_MANAGER` | Catalogue write + publish (Journal, FAQs, Media, Tours, Settings) |
| `SAFARI_CONSULTANT` | Read catalogue, no publish |
| `RESERVATION_STAFF` | Bookings/quotes/inquiries, no publish |
| `OPERATIONS_MANAGER` | Fleet, guides, transfers, calendar |
| `FINANCE_USER` | Invoices, payments, refunds (read catalogue) |

Sign in at `/login`. Staff land in `/admin`. (Two dev-only fixtures also
exist from e2e runs: `phase3-e2e-admin@example.com` /
`E2E-Admin-Password-123!` and the `…-consultant@…` twin — fine for
clicking around, not for anything real.)

**Customer:** open `/register`, create an account with the **same email**
you will book with — guest bookings on that email are claimed automatically
and appear in `/dashboard`.

## 2. Dashboard map

**Customer portal:** `/dashboard` (journey card + “Latest updates” feed) ·
`/my-safaris` · `/safari/[reference]` (tabs: Journey, Travellers, Group,
Payments, Documents, Messages) · `/profile` (incl. password change).

**Operations (`/admin`):** Dashboard (real counts + pipeline) · Bookings
(pipeline board → workspace: status, crew/fleet assignment, transfers,
travellers, payments/refunds, invoices, messages, internal notes,
documents, history) · Calendar (`?month=N`, conflict flags) · Fleet &
guides · Transfers · Travellers · Quotes · Invoices · Payments ·
Enquiries · Notifications (outbox log) · Audit · Journal/Blog · FAQs ·
Media · Settings · Tours · Destinations.

## 3. The end-to-end run

### Act 1 — Discover (public site)

1. `/` hero → **Design Your Safari** and **Explore Safaris** both work.
2. `/tours` → open a tour: day-by-day itinerary, inclusions/exclusions,
   the “similar standard” accommodation note, no instant prices (by design).
3. Sidebar **“Request this safari”** → `/contact?tour=…` → submit → you get
   an `INQ-…` reference. Find it in `/admin/inquiries`.
4. Browse `/destinations`, one destination page, `/experiences`, `/blog`,
   `/faq`, `/travel-information`. `/sitemap.xml` lists tours, destinations,
   posts.

### Act 2 — Design your safari (builder)

1. `/builder`: regions → experiences → dates → travellers → style →
   interests → destinations → stay → transport → activities.
2. Try the gates: continue with no destination / no date is blocked.
3. Reload mid-flow — the draft persists. Finish → **“Request precise
   quote”** → tracked inquiry with structured metadata (visible in
   `/admin/inquiries`).

### Act 3 — Quote (planner, via API + admin UI)

Log in as staff in the browser, then in a terminal (cookie jar keeps the
session):

```bash
curl -c jar -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"<12+ chars>"}'
curl -b jar -X POST localhost:3000/api/admin/quotes \
  -H 'Content-Type: application/json' \
  -d '{"startDate":"2027-08-10","endDate":"2027-08-16","adults":2,"children":1,
       "comfortTier":"mid-range","transportStyle":"land-cruiser","currency":"USD",
       "customerName":"Test Traveller","customerEmail":"customer@example.com",
       "promoCode":"EARLYBIRD"}'
# → 201, number Q-…, totals, 30% deposit, EARLYBIRD 10% discount
```

Watch in `/admin/quotes`: open the quote, then move it
`DRAFT → SENT → ACCEPTED → CONVERTED` (PATCH
`/api/admin/quotes/[id]` `{"status":"…"}` — skipping straight to
`ACCEPTED` is rejected with 422). `SENT` emails the customer (log
provider in dev); `CONVERTED` creates the booking with its snapshot.

### Act 4 — Reserve (guest booking + holds)

```bash
curl -X POST localhost:3000/api/bookings -H 'Content-Type: application/json' \
  -d '{"customerName":"Test Traveller","customerEmail":"customer@example.com",
       "travelStart":"2027-09-18T06:00:00Z","travelEnd":"2027-09-24T18:00:00Z","adults":2}'
# → 201, reference ABCT-…
```

Find it on the `/admin/bookings` pipeline (INQUIRY). Open the workspace.

Pin inventory with a hold (staff session, needs a real vehicle
registration from `/admin/fleet`):

```bash
curl -b jar -X POST localhost:3000/api/admin/holds \
  -H 'Content-Type: application/json' \
  -d '{"bookingId":"<id>","resourceType":"vehicle","resourceId":"<REG>",
       "quantity":1,"startsAt":"2027-09-18T06:00:00Z","endsAt":"2027-09-24T18:00:00Z",
       "capacity":6,"ttlMinutes":60}'
```

Double-book the same vehicle/dates from a second booking → `409`.
Let a hold lapse (or wait out `ttlMinutes`), run `npm run sweep`, and
check `/admin/notifications` for the `hold.expired` entry.

### Act 5 — Operate (booking workspace)

Advance the booking through the pipeline control:
`HOLD → AWAITING_DEPOSIT → CONFIRMED → PRE_TRIP → ON_SAFARI → COMPLETED`
(invalid jumps are rejected; every move lands in history + audit log).

- **Fleet first:** `/admin/fleet` — create a vehicle
  (registration/type/capacity) and a guide (name/phone/languages); the
  seed has vehicles but no guides.
- In the workspace assign that vehicle + guide over the travel dates,
  then try an overlapping assignment → rejected with the clashing booking
  named. `/admin/calendar?month=N` flags any conflict visually.
- Add a transfer (`/admin/transfers`: JKIA pickup → hotel) and watch it
  on the calendar.
- Post a message to the customer and an internal note; attach nothing
  sensitive to the wrong one.

### Act 6 — Pay (mock provider)

1. As the customer: `/register` with the booking email → `/dashboard`
   claims the booking → open it → **Payments** tab → pay the deposit
   (kind DEPOSIT). Status starts PENDING with a receipt withheld.
2. Settle it like the provider callback would (copy the `providerRef`
   from the workspace Payments list or `/admin/payments`):

```bash
npm run payments:settle -- <providerRef>
# webhook -> 200, { applied: true, ... }
```

3. Refresh the portal: SUCCEEDED, totals updated, **Receipt** link live,
   `payment.received` email in `/admin/notifications`.
4. As staff in the workspace: partial **Refund** (amount + reason) →
   paid total drops. Full refund of a cancelled booking routes the
   booking to `REFUND_PENDING`.
5. Cancel a paid booking (guest: `POST /api/bookings/[id]/cancel` with
   the email; staff: workspace) → verify `REFUND_PENDING` vs `CANCELLED`.

### Act 7 — Travel (portal + in-trip mode)

- **Travellers tab:** add travellers, fill passport details; checklist
  counts update on `/dashboard`.
- After `ON_SAFARI`: the workspace shows the **“Today · Day N”** panel
  with guide contact and pickup point.
- **Digital passport**, pre-trip checklist, confirmation/itinerary
  print views, receipts under Documents.

### Act 8 — Group travel

1. Workspace **Group** tab (as organiser): name the group, add two
   traveller emails → invite links appear.
2. Open an invite link in a private window: `/invite/[token]` → traveller
   completes name/passport/diet/room. Organiser dashboard shows
   `17/18 complete`-style aggregates **without** exposing passport or
   medical details across travellers — verify by opening a second
   traveller link.
3. Group payment summary shows per-person splits.

### Act 9 — Reminders, notifications, concierge

1. `npm run sweep` — prints `{ holdsExpired, quotesExpired,
   tripReminders, balanceReminders, holdExpiringWarnings }`; re-run →
   all zeros (idempotent). New rows land in `/admin/notifications`;
   customer rows surface in the dashboard “Latest updates” feed.
2. **Concierge widget** (“Ask us”, every page):
   - Anonymous: “Where can I go?”, “Tell me about the migration”
     (note the never-guaranteed phrasing), “What should I pack?”,
     quick-prompt buttons.
   - Signed in: “What is the balance on ABCT-…?”, “How do I contact my
     guide?”, “Where are we staying tonight?”
   - “Have a planner call me” → confirm **Yes** → `INQ-…` filed
     (check `/admin/inquiries`); without confirming, nothing is filed.
   - “Refund my payment” → refused with human handoff; nothing happens.
   - Ask about someone else's reference → “can't find … on your account”.

### Act 10 — Content studio (no deploys needed)

1. `/admin/blog` → New → draft → preview stays private → Publish →
   live on `/blog`. Unpublish → gone.
2. `/admin/faqs` → add + reorder → live on `/faq`.
3. `/admin/media` → register an image URL with alt text + credit.
4. `/admin/settings` → change the primary phone → footer/contact page
   reflect it. SEO titles/descriptions on tours, destinations, posts
   render as meta/OG tags (view source).

### Act 11 — Permissions (prove the matrix, don't trust buttons)

1. Log in as `SAFARI_CONSULTANT` → `POST /api/admin/tours` → **403**;
   anonymous → **401**.
2. Log in as customer → visit `/admin` → bounced to login.
3. Do real work in `/admin/audit-logs` — every action above is there
   with actor, action, resource.

## 4. API cheat sheet (staff session via `jar` file as in Act 3)

| Do | Call |
| -- | ---- |
| List bookings | `GET /api/admin/bookings?status=CONFIRMED` |
| Move booking | `PATCH /api/admin/bookings/[id]` `{"status":"PRE_TRIP"}` |
| Lookup (guest) | `GET /api/bookings/lookup?reference=ABCT-…&email=…` |
| My bookings | `GET /api/account/bookings` (customer session) |
| Group dashboard | `GET /api/account/bookings/[ref]/group` |
| Concierge | `POST /api/concierge` `{"message":"…"}` |
| Sweep (cron) | `POST /api/admin/maintenance/sweep` or `npm run sweep` |

Error shape is always `{ code, message, details?, requestId? }` — never a
stack trace.

## 5. Resetting between runs

- Always use **fresh emails** (`you+test1@…` works — Gmail-style aliases
  all land in one inbox).
- Idempotency keys make payment/booking retries safe to repeat.
- Never `db:reset` with data you want; never `db:seed` outside dev.
- E2e leftovers (`phase3-e2e-…`, `portal-notify-…`, `organiser-…`) are
  dev-only fixtures — delete freely or ignore.

## 6. If something looks broken

- Stuck on login/register >30s under load: normal bcrypt cost, wait.
- `429 rate_limited`: you hit a per-IP throttle — wait or restart dev.
- `422` on writes: read `details` — usually a state-machine or overlap
  rule doing its job (try the invalid transition deliberately to see it).
- Blank dialog/widget: hard-refresh (dev CSP needs eval for HMR).
- DB unreachable: `docker compose ps`, `npm run db:check`.
