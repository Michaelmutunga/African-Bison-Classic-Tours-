You are the lead software architect, senior full-stack engineer, product designer, UX engineer, QA engineer, DevOps engineer, and technical project manager for this project.

You are building a production-grade tourism platform and reservation management system for:

AFRICAN BISON CLASSIC TOURS

GitHub repository:

Michaelmutunga/African-Bison-Classic-Tours-

Default branch:

main

The repository is currently a greenfield/empty repository. Do not assume an existing application architecture.

The finished product must be a premium, state-of-the-art East African safari website combined with a serious booking, reservation, customer portal, and internal tour operations platform.

This is NOT merely a tourism brochure website.

The product should combine:

1. Luxury travel discovery
2. Safari package discovery
3. Custom safari planning
4. Interactive itinerary building
5. Live/configurable quotation
6. Reservation management
7. Payment management
8. Customer accounts
9. Traveller management
10. Accommodation management
11. Vehicle management
12. Guide management
13. Activity management
14. Airport transfer management
15. Internal operations management
16. Content management
17. Customer communication
18. Pre-trip preparation
19. In-trip assistance
20. Post-trip journey history

The product should feel like a premium international travel platform while retaining African Bison Classic Tours' identity and East African safari character.

Do not make the website look like a generic WordPress safari template.

Do not produce an AI-looking SaaS website.

Do not overuse rounded cards, gradients, glassmorphism, excessive shadows, generic dashboard widgets, or meaningless animation.

The design should feel editorial, cinematic, premium, modern, sophisticated, fast, and trustworthy.

======================================================================
0. NON-NEGOTIABLE DEVELOPMENT RULES
======================================================================

Before writing code:

1. Inspect the repository.
2. Inspect the git status.
3. Inspect available branches.
4. Inspect the repository configuration.
5. Confirm whether any files have appeared since the task began.
6. Inspect the live African Bison Classic Tours website and use it as the primary source for existing business content.
7. Do not assume the current website content from memory.
8. Do not invent business facts, prices, guarantees, hotels, vehicle availability, park fees, or operational policies.
9. Existing business information must either be taken from the current site, marked as configurable, or represented as placeholder content clearly intended to be replaced.
10. Do not use fake production credentials.
11. Never commit `.env`, credentials, API keys, private keys, passwords, database dumps, payment secrets, or other secrets.
12. Create `.env.example`.
13. Never force push.
14. Never delete unrelated work.
15. Never overwrite work that was introduced by another contributor without inspecting it first.
16. Do not perform unrelated refactors.
17. Do not stop after building only the landing page.
18. Do not declare a phase complete until its tests pass.
19. Do not commit broken code.
20. Do not push code when required tests are failing.
21. Every completed phase must result in:
   - implementation
   - automated tests
   - manual verification
   - production build verification
   - git commit
   - git push
22. Work directly toward a production-ready application.
23. Prefer simple, maintainable architecture over unnecessary abstraction.
24. Use strong typing throughout.
25. Do not use `any` unless there is a documented technical reason.
26. Use proper validation on every public API boundary.
27. Handle loading, empty, success, error, and offline/network-failure states.
28. Build responsive layouts from the beginning, not as an afterthought.
29. Accessibility is part of the acceptance criteria.
30. SEO is part of the acceptance criteria.
31. Security is part of the acceptance criteria.

======================================================================
1. PRIMARY PRODUCT OBJECTIVE
======================================================================

Build African Bison Classic Tours into a digital safari planning and reservation platform.

The fundamental product model is:

DISCOVER
    ↓
PLAN
    ↓
DESIGN
    ↓
QUOTE
    ↓
RESERVE
    ↓
PAY
    ↓
PREPARE
    ↓
TRAVEL
    ↓
REMEMBER

The public website should sell the experience.

The safari planner should allow customers to create or customize the experience.

The booking engine should turn that journey into a structured reservation.

The customer portal should deliver the journey.

The operations dashboard should allow African Bison staff to actually operate the journey.

======================================================================
2. BRAND AND BUSINESS CONTEXT
======================================================================

Current business name:

African Bison Classic Tours

Current public positioning focuses heavily on:

- Kenya safaris
- Tanzania safaris
- Kenya + Tanzania safari combinations
- Maasai Mara
- Serengeti
- Great Wildebeest Migration
- Amboseli
- Lake Nakuru
- Lake Naivasha
- Ngorongoro
- Tarangire
- Lake Manyara
- Mount Kilimanjaro
- Mount Kenya
- Nairobi experiences
- Wildlife
- Big Five
- Cultural experiences
- Honeymoons
- Family trips
- Luxury safari
- Camping
- Balloon safaris
- Air safaris
- Beach holidays
- Airport transfers
- Private/custom safari planning
- Group travel
- Corporate trips

Current contact information visible on the live site includes:

African Bison Classic Tours
Nairobi, Kenya
JKIA Airport, 1st Floor, Suite 1

Phone:
+254 734 466 432

Additional phone:
+254 111 234 567

Email:
info@africanbisonclassictours.com

IMPORTANT:

Treat these values as initial content, not immutable constants.

Create a site settings/configuration area so business contact information can later be changed without changing source code.

Verify current live-site information before finalising public copy.

======================================================================
3. CURRENT SAFARI INVENTORY TO REPRESENT
======================================================================

The current website advertises the following Kenya safari products.

KENYA SAFARIS

1 Day Nairobi Safari, Culture, Wildlife & Iconic Attractions

2 Days Amboseli National Park Safari

3 Days Masai Mara Game Reserve Safari

4 Days Great Masai Mara Migration and Balloon Safari

5 Days Amboseli, Lake Naivasha & Masai Mara Safari

6 Days Amboseli, Aberdares, Lake Nakuru & Masai Mara Safari

7 Days Best of Kenya Safari Tour

10 Days Kenya Wildlife Adventure Safari

The site also contains Nairobi day experiences including:

- Nairobi National Park
- Nairobi National Museum
- Giraffe Centre
- Sheldrick Elephant Orphanage
- Bomas of Kenya
- Carnivore Restaurant

Do not invent details that cannot be verified.

======================================================================
4. KENYA + TANZANIA INVENTORY
======================================================================

Represent the current published product catalogue:

7 Days Lake Nakuru, Masai Mara, Serengeti & Ngorongoro Crater Safari

8 Days Masai Mara, Lake Nakuru, Serengeti & Ngorongoro Crater Safari

8 Days Lake Nakuru, Amboseli, Lake Manyara, Serengeti & Ngorongoro Crater

9 Days Masai Mara, Lake Nakuru, Amboseli, Serengeti & Ngorongoro Crater Safari

9 Days Amboseli, Serengeti, Lake Manyara & Ngorongoro Crater Safari

10 Days Kenya & Tanzania Amazing Wildlife Safari

12 Days Kenya & Tanzania Wildlife Safari

======================================================================
5. TANZANIA INVENTORY
======================================================================

Represent the currently published Tanzania catalogue:

3 Days Serengeti National Park Safari

4 Days Tarangire, Ngorongoro Crater & Lake Manyara Safari

5 Days Lake Manyara, Ngorongoro Crater & Tarangire Safari

6 Days Best of Tanzania Adventure Safari

7 Days Lake Manyara, Serengeti, Ngorongoro & Tarangire Safari

The application must allow additional destinations and packages to be added later without changing application code.

======================================================================
6. EXISTING PRODUCT CONTENT MODEL
======================================================================

Current safari pages generally contain:

- Safari title
- Duration
- Safari overview
- Destination descriptions
- Day-by-day itinerary
- Accommodation
- Meals
- Activities
- Transportation
- Park/game reserve fees
- English-speaking driver/guide
- Airport transfers
- Mineral water
- Optional activities
- Inclusions
- Exclusions
- Booking CTA

Turn these into structured data.

Do not store the entire itinerary as one giant HTML blob.

Create structured entities for:

Destination
Tour Product
Tour Category
Itinerary
Itinerary Day
Activity
Accommodation Option
Meal Plan
Transport
Transfer
Park/Reserve
Pricing
Season
Availability
Optional Add-on
Inclusion
Exclusion

======================================================================
7. IMPORTANT CURRENT-CONTENT BEHAVIOUR
======================================================================

The existing site frequently uses phrases such as:

"or similar"

for accommodation.

Therefore the data model must support:

Primary accommodation
Alternative accommodation
Accommodation category
Room type
Board basis
Availability status
Price override
Supplier confirmation status

Do not assume a hotel is always guaranteed unless confirmed by an administrator.

Likewise, wildlife sightings are inherently unpredictable.

Never present wildlife sightings as guaranteed.

The system can present planning guidance such as:

"Typically excellent for..."

but should not claim:

"You will definitely see..."

unless explicitly presented as a business statement from an administrator and clearly treated as marketing copy.

======================================================================
8. CORE USER TYPES
======================================================================

The system must support at minimum:

PUBLIC VISITOR

CUSTOMER

GROUP ORGANISER

TRAVELLER

SAFARI CONSULTANT

RESERVATION STAFF

OPERATIONS MANAGER

FINANCE USER

CONTENT MANAGER

ADMINISTRATOR

SUPER ADMINISTRATOR

Use role-based access control.

Permissions must be explicit.

Do not simply hide buttons and assume that provides security.

Authorization must happen server-side.

======================================================================
9. TECHNOLOGY STACK
======================================================================

Use a modern TypeScript-first architecture.

Recommended stack:

Frontend/application:
Next.js with App Router
TypeScript

Styling:
Tailwind CSS

UI primitives:
shadcn/ui or equivalent accessible component primitives

Animation:
Motion / Framer Motion

Database:
PostgreSQL

ORM:
Prisma

Validation:
Zod

Forms:
React Hook Form

Authentication:
Use a secure production-ready authentication implementation.
Do not invent insecure password handling.

Password hashing:
Argon2id or equivalent strong password hashing.

Email:
Create an email provider abstraction.
The first implementation may use a provider such as Resend if credentials are supplied.
Do not hard-code a vendor into business logic.

Storage:
Use an abstraction for object/image storage.

Maps:
Use Mapbox or MapLibre depending on available project credentials and licensing.
Keep map integration behind a clear component/service boundary.

Date handling:
Use a proper timezone-aware date library such as date-fns with timezone support or equivalent.

Money:
Never use floating point for financial calculations.
Use integer minor units or Decimal.
Use explicit currency codes.

Testing:
Vitest or Jest for unit/integration testing.
Playwright for browser end-to-end testing.

Linting:
ESLint.

Formatting:
Prettier.

Git hooks may be used where useful, but do not make local development fragile.

======================================================================
10. ARCHITECTURE
======================================================================

Build a modular monolith first.

Do NOT split the application into microservices.

The initial architecture should have:

PUBLIC WEBSITE
CUSTOMER APPLICATION
ADMIN/OPERATIONS APPLICATION
API/SERVER LAYER
POSTGRES DATABASE
BACKGROUND/JOB LAYER ONLY WHERE REQUIRED

Keep modules logically separated.

Suggested structure:

/app
/components
/features
/lib
/server
/db
/prisma
/tests
/e2e
/public
/emails
/docs
/scripts

Use feature-oriented boundaries.

Suggested features:

features/auth
features/tours
features/destinations
features/safari-builder
features/booking
features/payments
features/customers
features/travellers
features/accommodations
features/vehicles
features/guides
features/activities
features/transfers
features/operations
features/content
features/notifications
features/documents
features/reports

Do not create huge monolithic components.

======================================================================
11. DOMAIN ARCHITECTURE
======================================================================

Create a proper relational domain model.

Core entities:

User

Role

Permission

CustomerProfile

Traveller

Group

Destination

Park

TourProduct

TourCategory

Itinerary

ItineraryDay

Activity

Accommodation

AccommodationRoomType

AccommodationOption

Vehicle

VehicleType

Guide

Transfer

Season

PricingRule

PriceComponent

TourAddOn

Availability

ResourceAllocation

Booking

BookingTraveller

BookingItinerary

BookingDay

BookingActivity

BookingAccommodation

BookingTransport

BookingTransfer

Quote

QuoteItem

Invoice

Payment

Refund

PaymentAttempt

BookingStatusHistory

CustomerMessage

InternalNote

Notification

Document

TravelDocument

AuditLog

SiteSetting

MediaAsset

BlogPost

Faq

ContactInquiry

WaitlistEntry

Hold

PromoCode

CurrencyRate

Do not create every imaginable table on day one.

Only create structures that support the required workflows.

Use migrations.

Use foreign keys.

Use database constraints.

Use indexes on high-query fields.

Use unique constraints where logically required.

======================================================================
12. BOOKING STATE MACHINE
======================================================================

Bookings must use explicit lifecycle states.

Initial model:

INQUIRY

QUOTE_DRAFT

QUOTE_SENT

HOLD

AWAITING_DEPOSIT

CONFIRMED

PRE_TRIP

ON_SAFARI

COMPLETED

CANCELLED

EXPIRED

REFUND_PENDING

REFUNDED

Do not permit arbitrary status changes.

Implement valid state transitions.

Record every status change in BookingStatusHistory.

Record:

previous status
new status
actor
timestamp
reason
metadata

======================================================================
13. SOFT HOLD SYSTEM
======================================================================

Implement temporary booking holds.

Example:

A customer creates a custom safari.

Selected accommodation/resources are temporarily held.

The booking is placed into HOLD.

The hold expires automatically.

Implement:

hold ID
booking ID
resource
quantity
start
end
expiresAt
createdBy
status

Build expiration logic.

Do not let expired holds continue blocking inventory.

Add database-level protections against duplicate allocation where practical.

Write automated tests for:

Two users requesting the same resource.

Hold expires.

Hold is renewed.

Hold is converted to confirmed booking.

Hold cancellation releases resources.

Expired holds are not shown as active inventory.

======================================================================
14. CONCURRENCY AND DOUBLE-BOOKING SAFETY
======================================================================

This is a reservation system.

Treat concurrency as a serious requirement.

The system must prevent scenarios such as:

Two customers booking the same vehicle.

Two bookings consuming the same limited accommodation inventory.

Two users taking the same availability slot.

Two payment callbacks creating duplicate payment records.

Two retries creating duplicate booking confirmations.

Use database transactions.

Use unique constraints.

Use idempotency keys.

Use transactional resource allocation.

Test concurrent booking attempts.

======================================================================
15. SAFARI DISCOVERY EXPERIENCE
======================================================================

Build a premium discovery interface.

Homepage hero should not just say:

"Welcome to African Bison Classic Tours."

Create a more experiential presentation.

Core concept:

YOUR AFRICA.
YOUR WAY.

Primary CTA:

DESIGN YOUR SAFARI

Secondary CTA:

EXPLORE SAFARIS

Do not blindly copy this wording if better brand copy emerges from actual content review.

The design should immediately communicate:

East Africa
wildlife
luxury
personalisation
trust
expertise

======================================================================
16. HOMEPAGE STRUCTURE
======================================================================

Build approximately:

HERO

Large cinematic safari visual/video area.

Primary action:
Design Your Safari

Secondary action:
Explore Safaris

Destination/experience navigation.

Then:

Signature Journeys

Interactive East Africa Map

Safari Finder

Featured Safaris

Great Migration

Big Five

Kenya

Tanzania

Kenya + Tanzania

Mountain Experiences

Culture

Bush + Beach

Luxury / Fly-in

Why African Bison

Travel Stories

Testimonials if real source data exists

Final planning CTA

Footer

Do not create fake reviews.

Do not create fake awards.

Do not invent certifications.

======================================================================
17. VISUAL DIRECTION
======================================================================

Do not build a generic safari site.

Design principles:

Editorial
Cinematic
Minimal
Premium
Immersive
Quietly luxurious
African without clichés
High contrast
Excellent typography
Large photographic compositions
Subtle motion
Strong whitespace
Fine-line maps
Natural visual hierarchy

Avoid:

Excessive rounded cards
Excessive gradients
Fake AI gradients
Neon colors
Unnecessary glassmorphism
Huge rounded containers
Excessive badges
Generic dashboard cards
Emoji-heavy UI
Stock-template layouts
Cheap-looking safari clichés
Animal silhouettes scattered everywhere
Overuse of tribal patterns
Excessive gold

Suggested visual palette:

Deep charcoal / near-black
Warm ivory
Savannah sand
Muted earth greens
Natural brown
Subtle terracotta/orange accent

Do not hard-code the palette throughout the application.

Create design tokens.

======================================================================
18. TYPOGRAPHY
======================================================================

Use no more than two primary font families.

Typography should feel like a premium travel editorial.

Create:

Display
Heading 1
Heading 2
Heading 3
Body
Small
Caption
Label
Numeric

Do not use extremely small body text.

Ensure comfortable reading widths.

======================================================================
19. ANIMATION
======================================================================

Motion should communicate the journey.

Use animation for:

Page transitions
Map routes
Itinerary expansion
Image reveal
Calendar transitions
Price changes
Booking step transitions
Navigation state
Scroll storytelling

Do NOT animate everything.

Respect prefers-reduced-motion.

======================================================================
20. INTERACTIVE EAST AFRICA MAP
======================================================================

Build an interactive geographic experience.

Locations can include:

Nairobi
Amboseli
Lake Nakuru
Lake Naivasha
Maasai Mara
Samburu
Aberdares
Serengeti
Ngorongoro
Tarangire
Lake Manyara
Arusha
Mount Kilimanjaro
Mombasa
Diani
Watamu
Zanzibar
Uganda destinations only when actual content is entered

Use map markers.

Allow selected itinerary locations to form a route.

When a route changes:

Update the itinerary.

Display route sequence.

Display destination cards.

Calculate journey distances only when a reliable mapping service is configured.

Do not fake precise travel times.

======================================================================
21. "DESIGN YOUR SAFARI" BUILDER
======================================================================

This is one of the most important features.

Create a guided planning experience.

Step 1:

Where are you going?

Kenya
Tanzania
Kenya + Tanzania
Uganda
Zanzibar / beach extension where available

Step 2:

What kind of experience?

Wildlife
Big Five
Great Migration
Family
Honeymoon
Luxury
Adventure
Culture
Photography
Beach
Mountain
Private safari
Group safari
Corporate

Step 3:

When are you travelling?

Date range.

Use a high-quality calendar.

Show season information.

Do not promise wildlife availability.

Step 4:

Travellers

Adults
Children
Infants where applicable

Step 5:

Travel style

Private
Shared
Luxury
Mid-range
Value

Step 6:

Interests

Elephants
Big Cats
Rhino
Birds
Scenery
Culture
Photography
Migration
Beach
Adventure

Step 7:

Destinations

Allow the user to select destinations.

Step 8:

Accommodation level.

Step 9:

Transport style.

Step 10:

Optional activities.

Then produce a live itinerary.

======================================================================
22. SAFARI DNA / TRIP PROFILE
======================================================================

Create an elegant summary of the customer's selected preferences.

Example:

YOUR JOURNEY PROFILE

Wildlife Focus
High

Photography
High

Comfort
Luxury

Pace
Relaxed

Culture
Medium

Adventure
Medium

This is not a scoring system that claims scientific accuracy.

It is simply a visual summary of user-selected preferences.

======================================================================
23. SAFARI ITINERARY BUILDER
======================================================================

Create a sophisticated itinerary timeline.

Example structure:

DAY 01

NAIROBI

Arrival
Airport transfer
Hotel check-in

DAY 02

NAIROBI → AMBOSELI

Transfer
Lunch
Game drive
Overnight

Each day should be expandable.

Each day should support:

Destination
Travel leg
Activities
Accommodation
Meals
Transfer
Free time
Optional experiences
Notes

Allow user to modify itinerary.

======================================================================
24. ITINERARY CUSTOMIZATION
======================================================================

Customer should be able to:

Add destination.

Remove destination.

Change number of nights.

Change accommodation.

Add activity.

Remove optional activity.

Change accommodation tier.

Change private/shared transport where supported.

Request custom modifications.

When a modification impacts availability, display:

"Availability needs confirmation"

rather than falsely showing guaranteed availability.

======================================================================
25. ACCOMMODATION SELECTOR
======================================================================

For each applicable stay:

Show:

Accommodation
Location
Images
Category
Room type
Board basis
Highlights
Availability status
Price difference
Selected state

Support:

Included
Upgrade
Alternative
Request confirmation

Example:

DAY 05 · MASAI MARA

Current:

Luxury Safari Camp

Alternative:

Premium Lodge

Upgrade:

+ USD X

Do not invent the price.

Prices must be database-driven.

======================================================================
26. OPTIONAL EXPERIENCE SYSTEM
======================================================================

Examples based on current site content include:

Hot air balloon safari
Maasai cultural experience
Boat ride
Photography experiences
Hiking
Rock climbing
Beach extensions
Bush experiences

The system must treat these as configurable products.

Each add-on should have:

Name
Description
Duration
Location
Price
Currency
Availability
Capacity
Required booking window
Eligibility
Inclusions
Exclusions

======================================================================
27. LIVE QUOTE
======================================================================

Create a live quote summary.

Example:

YOUR SAFARI

2 Adults

8 Days

Private vehicle

Accommodation
$X

Park fees
$X

Transport
$X

Activities
$X

Transfers
$X

Add-ons
$X

TOTAL
$X

DEPOSIT
$X

BALANCE
$X

The exact calculation must come from database pricing rules.

Use Decimal or minor units.

Never calculate monetary values with floating-point arithmetic.

======================================================================
28. PRICING ENGINE
======================================================================

Create a flexible pricing engine.

Pricing factors may include:

Number of travellers
Adults
Children
Number of nights
Accommodation
Season
Destination
Park fees
Vehicle type
Private/shared
Activities
Transfers
Flights
Add-ons
Custom services

Implement price components.

Every quote must preserve a snapshot of the pricing inputs used to create it.

Do not rely on recalculating historical bookings from today's pricing rules.

A confirmed booking must retain its commercial snapshot.

======================================================================
29. CURRENCY
======================================================================

Primary business region:

Kenya / East Africa

Potential customer base is international.

Support:

KES
USD
EUR
GBP

Do not assume fixed exchange rates.

Create currency configuration.

Where conversion is displayed, identify:

Base currency
Display currency
Rate timestamp

Do not silently change a booking's base currency.

======================================================================
30. RESERVATION FLOW
======================================================================

Customer flow:

Build itinerary

↓

Review itinerary

↓

Enter traveller details

↓

Enter contact details

↓

Enter travel preferences

↓

Review price

↓

Choose reservation option

↓

Create account or continue as guest

↓

Accept terms

↓

Place booking/hold

↓

Payment if required

↓

Confirmation

The system should provide a booking reference.

Example:

ABCT-2026-000104

Do not use a sequential public ID as the only security mechanism.

======================================================================
31. CUSTOMER DATA
======================================================================

Customer profile:

First name
Last name
Email
Phone
Country
Preferred language
Preferred currency

Traveller:

Full name
Date of birth
Nationality
Passport details
Passport expiry
Emergency contact
Dietary requirements
Medical/accessibility notes only where explicitly necessary and with appropriate privacy handling

Do not collect sensitive information unnecessarily.

======================================================================
32. GROUP BOOKING
======================================================================

Build a group booking flow.

Example:

Corporate safari

18 travellers

Group organiser creates booking.

Then each traveller receives a secure invitation link.

Traveller fills:

Name
Passport information
Diet
Emergency contact
Room preference
Travel information

Group organiser can see:

18 travellers
17 completed
16 passports
2 room preferences pending

Do not expose one traveller's private information to another traveller.

======================================================================
33. CUSTOMER ACCOUNT / SAFARI PORTAL
======================================================================

Build:

/account

/dashboard

/my-safaris

/safari/[bookingId]

/payments

/travellers

/documents

/messages

/profile

The main dashboard should feel like a personal journey workspace.

Example:

MICHAEL'S AFRICAN JOURNEY

Kenya + Tanzania

12 days

Upcoming

Your route:

Nairobi
Amboseli
Lake Nakuru
Maasai Mara
Serengeti
Ngorongoro

Progress:

Deposit paid
Traveller details complete
Passport details pending
Final balance pending

======================================================================
34. DIGITAL SAFARI PASSPORT
======================================================================

Create a beautiful digital journey/passport concept.

It should display:

Countries
Destinations
Dates
Journey progress
Completed destinations
Guide
Vehicle
Accommodation
Activities

Do not make this childish.

Make it feel like an elegant digital travel document.

======================================================================
35. PRE-TRIP CHECKLIST
======================================================================

Customer portal should show:

Passport information
Travel dates
Flight details
Airport pickup
Accommodation
Emergency contact
Payment status
Required documents
Packing guide
Travel information

Checklist state:

Not started
In progress
Complete

======================================================================
36. IN-TRIP MODE
======================================================================

Once the booking enters ON_SAFARI:

Customer portal becomes more operational.

Show:

TODAY

Day 4

Maasai Mara

07:00 Morning game drive

09:30 Breakfast

12:30 Lunch

15:30 Afternoon game drive

Guide:

[Name]

Contact:

Call
WhatsApp

Pickup:

[Location]

The portal should emphasize the current day rather than sales content.

======================================================================
37. SAFARI CONCIERGE
======================================================================

Create an AI/service-assistant abstraction.

DO NOT build a generic chatbot that has unrestricted access to the system.

The assistant must operate within a controlled context.

Public mode can answer approved information.

Authenticated mode can answer using the customer's itinerary.

Examples:

"What should I pack?"

"What time is tomorrow's game drive?"

"Where are we staying tonight?"

"How do I contact my guide?"

"When is my balance due?"

"How much have I paid?"

For sensitive actions such as modifying bookings:

Require explicit customer confirmation.

For financial/refund actions:

Do not allow AI alone to approve them.

Use normal backend permissions and workflows.

======================================================================
38. INTERNAL OPERATIONS CONSOLE
======================================================================

Create:

/admin

Dashboard

Bookings

Enquiries

Quotes

Customers

Travellers

Calendar

Itineraries

Destinations

Accommodations

Vehicles

Guides

Activities

Transfers

Payments

Invoices

Documents

Messages

Blog

Media

Reports

Settings

Users

Roles

Audit Logs

======================================================================
39. OPERATIONS DASHBOARD
======================================================================

Show operational facts.

Example:

TODAY

Active bookings
Arrivals
Departures
Airport transfers
Vehicles in use
Guides assigned
Bookings awaiting action

BOOKING PIPELINE

New inquiry
Quote sent
Awaiting deposit
Confirmed
Pre-trip
On safari
Completed

Do not fabricate metrics.

Display actual database values.

======================================================================
40. RESERVATION CALENDAR
======================================================================

Build resource-aware calendar.

Views:

Day
Week
Month

Resources:

Vehicles
Guides
Accommodation
Transfers
Bookings

Make conflicts visually obvious.

Example:

Vehicle LC300-04

Booking ABCT-1042

18 Sep - 24 Sep

Another booking attempts:

19 Sep - 22 Sep

The UI should show a conflict.

Backend must independently enforce the conflict.

======================================================================
41. RESOURCE MANAGEMENT
======================================================================

VEHICLES

Fields:

Registration
Vehicle type
Capacity
Status
Operator
Location
Notes

Types:

4x4 Safari Land Cruiser
Safari Van
Other configurable types

Do not assume all vehicles have the same capacity.

GUIDES

Name
Phone
Languages
Specialisations
Availability
Status
Notes

ACCOMMODATION

Property
Location
Category
Room types
Capacity
Board basis
Supplier
Availability
Pricing
Status

ACTIVITIES

Name
Destination
Duration
Capacity
Price
Availability

TRANSFERS

Pickup
Drop-off
Date/time
Passenger count
Vehicle
Driver/guide
Status

======================================================================
42. DRAG-AND-DROP ITINERARY EDITOR
======================================================================

Admin staff should be able to build/edit a safari itinerary visually.

Sections:

Day 1
Day 2
Day 3

Possible items:

Accommodation
Transfer
Game drive
Meal
Activity
Flight
Cultural experience
Free time

Changes must persist as structured data.

Do not store the visual order only in frontend state.

======================================================================
43. QUOTE MANAGEMENT
======================================================================

Internal users can:

Create quote.

Edit quote.

Apply discount.

Add custom charge.

Remove component.

Add note.

Send quote.

Expire quote.

Accept quote.

Convert quote to reservation.

Every quote needs:

Quote number
Customer
Validity date
Currency
Line items
Terms
Notes
Status
Created by
Created date

======================================================================
44. INVOICE AND PAYMENT SYSTEM
======================================================================

Create:

Invoice
Invoice item
Payment
Payment attempt
Refund
Payment allocation

Support:

Deposit
Partial payment
Balance
Full payment
Refund

Every payment must be idempotent.

Webhook handlers must be idempotent.

Never trust the browser as proof of payment.

The server/payment provider webhook must be authoritative.

======================================================================
45. PAYMENT PROVIDER ARCHITECTURE
======================================================================

Create an abstraction:

PaymentProvider

Methods such as:

createPayment
verifyPayment
handleWebhook
refundPayment
getTransactionStatus

Implement a test/mock provider.

Create a production adapter architecture for:

M-Pesa
Card
Potential future providers

Do not hard-wire payment-provider business logic throughout the booking module.

Use environment variables.

======================================================================
46. PAYMENT SAFETY
======================================================================

Never store:

Raw card numbers
CVV
Card secrets

Never log:

Payment credentials
API secrets
Full payment tokens
Sensitive personal information unnecessarily

Verify webhook authenticity.

Prevent duplicate webhook processing.

Write tests for:

Success

Failure

Timeout

Duplicate callback

Delayed callback

Unknown transaction

Refund

Partial payment

Payment after quote expiration

======================================================================
47. NOTIFICATIONS
======================================================================

Create a notification system.

Events:

Inquiry received
Quote created
Quote sent
Quote accepted
Hold created
Hold expiring
Hold expired
Deposit due
Deposit paid
Booking confirmed
Payment received
Balance due
Trip approaching
Traveller information incomplete
Document required
Booking modified
Booking cancelled
Trip started
Trip completed

Channels:

Email
WhatsApp integration abstraction
SMS abstraction where required
In-app notifications

Do not require all providers to be implemented initially.

Build interfaces.

======================================================================
48. EMAIL TEMPLATES
======================================================================

Create branded email templates for:

Inquiry confirmation
Quote
Booking confirmation
Payment receipt
Balance reminder
Pre-trip checklist
Trip itinerary
Trip reminder
Cancellation
Refund

Use real responsive HTML email templates.

======================================================================
49. CONTENT MANAGEMENT
======================================================================

Create manageable content entities for:

Destinations
Tours
Experiences
Blog posts
FAQs
Testimonials
About page
Contact information
Site settings

The admin should be able to edit content without changing code.

Do not build a full enterprise CMS unnecessarily.

Build a focused internal content-management system.

======================================================================
50. BLOG MIGRATION
======================================================================

The current site has a significant blog/travel-guide library.

The new site should support:

Blog title
Slug
Author
Publish date
Featured image
Excerpt
Content
Categories
Tags
SEO title
SEO description
Related destinations
Related tours

The current site contains travel content around topics such as:

Kenya landscapes
Great Migration
Luxury fly-in safaris
Kenya safari planning
Big Five
Honeymoons
Diani
Zanzibar
Packing
Seasonality
Accommodation
Responsible tourism

Import or recreate existing articles only where their content can be legitimately migrated.

Do not blindly copy broken/duplicate SEO text.

Clean up obvious duplication and spelling errors while preserving factual meaning.

======================================================================
51. SEO
======================================================================

Every public page must support:

Title
Meta description
Canonical
OpenGraph
Twitter/social metadata
Structured data
Breadcrumbs

Implement structured data for:

Organization
TouristTrip / Tour where appropriate
FAQ
Article
BreadcrumbList

Generate sitemap.

Generate robots.txt.

Use clean URLs.

Support image alt text.

Avoid keyword stuffing.

Optimize for search without producing AI-generated garbage copy.

======================================================================
52. PERFORMANCE
======================================================================

Target:

Fast first render

Optimized images

Lazy loading where appropriate

Server-side rendering where useful

Minimal JavaScript on static content

Code splitting

Cache safe public content

Avoid massive client bundles

Do not load a large map library on every page.

Do not load animation libraries globally if not needed.

======================================================================
53. ACCESSIBILITY
======================================================================

Meet WCAG 2.2 AA principles where practical.

Requirements:

Keyboard navigation

Visible focus

Proper labels

ARIA where needed

Semantic HTML

Contrast

Reduced motion

Accessible modal behaviour

Screen reader friendly booking form

Form validation messages

Do not rely solely on color.

======================================================================
54. MOBILE
======================================================================

Mobile is a first-class experience.

Customer booking flow must work comfortably on:

Phone
Tablet
Desktop

Admin dashboard may prioritise desktop but must remain usable on tablet.

The Safari Builder must be especially good on mobile.

Do not shrink desktop UI onto mobile.

Recompose it.

======================================================================
55. SECURITY
======================================================================

Implement:

Secure authentication
Password hashing
Authorization
Input validation
CSRF protection where applicable
Rate limiting
Secure cookies
Security headers
Content Security Policy where practical
SQL injection prevention through ORM
Output encoding
Audit logs
Webhook verification
Idempotency
Session expiration
Password reset
Email verification

Do not expose admin routes publicly without authorization.

Do not trust role claims coming solely from the browser.

======================================================================
56. AUDIT LOG
======================================================================

Create immutable audit entries for important actions.

Examples:

Booking status changed

Price changed

Quote modified

Payment created

Refund requested

Booking cancelled

Traveller details modified

Accommodation changed

Vehicle assigned

Guide assigned

Admin user changed

Role changed

Store:

Actor
Action
Resource
Resource ID
Timestamp
Before
After
Metadata

Do not store secrets in audit logs.

======================================================================
57. MEDIA SYSTEM
======================================================================

Create an image/media abstraction.

Each asset should support:

URL
Alt text
Caption
Credit
Source
License/status
Width
Height
Metadata

Do not silently use copyrighted third-party travel imagery.

Use:

Client-provided assets
Licensed assets
Properly sourced assets
Clearly marked placeholders during development

Build the image layout so replacing assets later does not require redesigning components.

======================================================================
58. SEED DATA
======================================================================

Create seed data for development.

Seed:

African Bison business settings

Known destinations

Known published safari products

Example itinerary structures

Example accommodations

Example activities

Example vehicles

Example guides

Example customers

Example bookings

Example payments

Example admin users

All demo data must be clearly identifiable.

Never accidentally expose development/demo records in production.

======================================================================
59. ADMIN USER BOOTSTRAP
======================================================================

Provide a secure development bootstrap method.

Example:

npm run seed

and/or:

npm run create-admin

The production deployment must require secure administrator setup.

Never place an actual production password in source code.

======================================================================
60. API DESIGN
======================================================================

Use a clear server/API architecture.

All API inputs must be validated.

Return consistent errors.

Example:

{
  code,
  message,
  details,
  requestId
}

Do not leak stack traces to production users.

Use typed service functions.

Separate:

Controller/API layer

Business logic

Persistence

External integrations

======================================================================
61. ERROR HANDLING
======================================================================

Build graceful error states.

Examples:

Payment provider unavailable.

Map service unavailable.

Database unavailable.

Email service unavailable.

Accommodation availability unknown.

Hold expired.

Price changed.

Session expired.

Reservation conflict.

Network request fails.

Customer should receive a useful message.

Do not expose internal stack traces.

======================================================================
62. TESTING STRATEGY
======================================================================

Testing is mandatory.

Unit tests:

Pricing

Booking state machine

Availability

Hold expiration

Currency

Validation

Permissions

Idempotency

Quote snapshots

Integration tests:

Database

Booking creation

Booking modification

Payment callbacks

Resource allocation

Notifications

Authentication

Authorization

E2E:

Homepage
Safari discovery
Safari builder
Custom itinerary
Quote
Reservation
Customer portal
Admin booking
Resource assignment
Payment flow using mock provider

======================================================================
63. PHASE STRUCTURE
======================================================================

Build the system in the following phases.

Do NOT attempt to build the entire application in one untested change.

Each phase must end with:

1. Implementation
2. Automated tests
3. Manual verification
4. Production build
5. Documentation update
6. Git commit
7. Git push

======================================================================
PHASE 0: DISCOVERY AND FOUNDATION
======================================================================

Tasks:

Inspect repository.

Set up project.

Choose final stack.

Initialize package manager.

Set up TypeScript.

Set up Next.js App Router.

Set up Tailwind.

Set up component system.

Set up ESLint.

Set up Prettier.

Set up Vitest/Jest.

Set up Playwright.

Set up PostgreSQL/Prisma.

Set up environment system.

Create `.env.example`.

Create Dockerfile.

Create docker-compose for local development.

Create basic health endpoint.

Create basic application shell.

Create initial documentation.

Create database migration system.

Create seed system.

Create CI workflow.

Create Railway configuration only where schema is verified.

Tests:

npm/pnpm lint

typecheck

unit test suite

production build

Docker build

container startup

health endpoint

Git:

Commit:
`chore(phase-0): initialize African Bison platform foundation`

Push to main.

Do not proceed to Phase 1 if Phase 0 fails.

======================================================================
PHASE 1: DESIGN SYSTEM AND PUBLIC SHELL
======================================================================

Build:

Header

Navigation

Footer

Typography

Tokens

Buttons

Inputs

Selects

Cards

Dialogs

Drawers

Toast

Tabs

Timeline

Calendar primitives

Data tables

Status badges

Loading states

Skeletons

Error states

Responsive layout system

Marketing page shell

Create the core visual identity.

Implement:

Homepage skeleton

Destination shell

Tour shell

Blog shell

Contact shell

Tests:

Component tests

Accessibility checks

Responsive checks

Production build

Playwright smoke test

Git commit:

`feat(phase-1): establish premium African Bison design system and shell`

Push.

======================================================================
PHASE 2: PUBLIC WEBSITE AND CONTENT
======================================================================

Build:

Homepage

Kenya pages

Tanzania pages

Kenya + Tanzania pages

Destination pages

Experience pages

Tour listing

Tour detail pages

Blog

About

Contact

FAQ

Travel information

Use actual current business inventory.

Migrate verified content.

Fix obvious copy errors.

Do not invent pricing.

Tests:

Every primary route returns successful response.

Navigation works.

No broken internal links.

Images load or show graceful placeholders.

SEO metadata exists.

Sitemap exists.

Structured data validates where applicable.

Mobile Playwright tests.

Desktop Playwright tests.

Git commit:

`feat(phase-2): build public African Bison travel experience`

Push.

======================================================================
PHASE 3: SAFARI CATALOGUE AND DATA MODEL
======================================================================

Implement structured tour system.

Admin can create:

Destination

Tour

Itinerary

Itinerary day

Activity

Accommodation

Add-on

Season

Price component

Implement public rendering from database.

Do not hardcode tour details into React components.

Tests:

CRUD

Validation

Permissions

Slug uniqueness

Published/unpublished behaviour

Tour rendering

Itinerary rendering

Seed data

Git:

`feat(phase-3): implement structured safari catalogue`

Push.

======================================================================
PHASE 4: SAFARI BUILDER
======================================================================

Build:

Design Your Safari flow.

Implement:

Destination selection

Travel dates

Traveller count

Travel style

Preferences

Safari interests

Destination ordering

Accommodation preference

Activity selection

Itinerary preview

Map

Safari profile

Price preview

Availability state

Save itinerary

Resume later

Tests:

Playwright full builder flow.

Back navigation.

Forward navigation.

Refresh persistence.

Invalid data.

Mobile builder.

Desktop builder.

No destination.

No date.

Traveller limits.

Git:

`feat(phase-4): implement interactive safari builder`

Push.

======================================================================
PHASE 5: PRICING AND QUOTATION ENGINE
======================================================================

Build:

Pricing rules

Seasonal pricing

Per-person pricing

Per-group pricing

Accommodation pricing

Activity pricing

Transport pricing

Transfer pricing

Park fees

Custom charges

Discounts

Currency

Quote generation

Quote snapshots

Quote expiry

Tests:

Money precision.

Multiple currencies.

Two adults.

Family.

Single traveller.

Group.

Different seasons.

Add-ons.

Discounts.

Expired quote.

Quote snapshot remains historically accurate.

Git:

`feat(phase-5): implement safari pricing and quotation engine`

Push.

======================================================================
PHASE 6: RESERVATION ENGINE
======================================================================

Implement:

Booking creation

Guest checkout

Customer account

Booking reference

Hold system

Availability

Resource allocation

State machine

Booking status history

Concurrency protection

Conflict detection

Cancellation workflow

Tests:

Complete reservation E2E.

Hold.

Hold expiration.

Duplicate booking attempt.

Concurrent booking.

Cancellation.

Modification.

Status transition validation.

Git:

`feat(phase-6): implement reservation and availability engine`

Push.

======================================================================
PHASE 7: PAYMENTS
======================================================================

Implement:

Payment abstraction

Mock payment provider

Deposit

Balance

Payment attempts

Webhook system

Idempotency

Payment records

Receipts

Refund architecture

Provider configuration

Do not activate production provider unless credentials/configuration exist.

Tests:

Payment success

Payment failure

Duplicate webhook

Timeout

Retry

Refund

Partial payment

Payment after expiry

Git:

`feat(phase-7): implement payment and transaction infrastructure`

Push.

======================================================================
PHASE 8: CUSTOMER PORTAL
======================================================================

Build:

Dashboard

My Safaris

Safari timeline

Digital safari passport

Traveller profiles

Documents

Payments

Messages

Pre-trip checklist

Guide information

Accommodation

Activities

In-trip mode

Tests:

Customer authentication.

Customer cannot access another customer's booking.

Booking visible only to owner/authorized group organiser.

Payment information correct.

Traveller privacy.

Mobile portal.

Git:

`feat(phase-8): implement customer safari portal`

Push.

======================================================================
PHASE 9: GROUP TRAVEL
======================================================================

Build:

Group booking

Group organiser

Traveller invitations

Traveller completion tracking

Room preferences

Group payment summary

Group itinerary

Tests:

Invitation.

Traveller registration.

Privacy.

Incomplete travellers.

Completed travellers.

Group booking modification.

Git:

`feat(phase-9): implement group travel workflows`

Push.

======================================================================
PHASE 10: OPERATIONS PLATFORM
======================================================================

Build admin:

Dashboard

Booking pipeline

Reservation calendar

Resource calendar

Vehicle management

Guide management

Accommodation management

Activity management

Transfer management

Traveller management

Quote management

Invoice management

Payment management

Itinerary editor

Conflict detection

Internal notes

Customer communications

Audit logs

Tests:

RBAC.

Admin-only routes.

Resource assignment.

Conflict detection.

Calendar.

Booking updates.

Audit log.

Git:

`feat(phase-10): implement African Bison operations platform`

Push.

======================================================================
PHASE 11: CONTENT MANAGEMENT
======================================================================

Build:

Destination CMS

Tour CMS

Blog CMS

FAQ CMS

Site settings

Media management

SEO fields

Publishing states

Draft

Scheduled

Published

Archived

Tests:

Content creation.

Editing.

Publishing.

Unpublishing.

Slug changes.

SEO metadata.

Permissions.

Git:

`feat(phase-11): implement content management`

Push.

======================================================================
PHASE 12: NOTIFICATIONS AND COMMUNICATION
======================================================================

Build notification infrastructure.

Email templates.

In-app notifications.

WhatsApp integration boundary.

SMS integration boundary.

Events:

Inquiry

Quote

Hold

Booking

Payment

Trip reminders

Balance reminders

Traveller completion

Trip started

Trip completed

Tests:

Event triggered.

Email generated.

Duplicate event does not create duplicate transaction.

Failed provider handled gracefully.

Git:

`feat(phase-12): implement customer notification system`

Push.

======================================================================
PHASE 13: SAFARI CONCIERGE
======================================================================

Implement the controlled assistant.

It must have strict data access.

Public assistant:

Destinations
Tours
FAQs
Travel information

Customer assistant:

Own booking
Own itinerary
Own payment state
Own assigned guide information

Do not allow unrestricted database access.

Do not allow arbitrary system mutations.

Actions that change bookings require explicit confirmation.

Financial actions require human/system authorization.

Tests:

Correct answers from seeded data.

Cannot access another customer.

Cannot reveal private admin data.

Cannot change booking without confirmation.

Cannot initiate unsupported financial actions.

Git:

`feat(phase-13): implement controlled safari concierge`

Push.

======================================================================
PHASE 14: HARDENING
======================================================================

Security:

Rate limiting

Headers

Session security

Input validation

Authorization

Audit logs

Webhook verification

Secret handling

Production error handling

Database constraints

Performance optimization

Accessibility

SEO

Image optimization

Caching

Tests:

Security checks.

Unauthorized routes.

Invalid JWT/session.

Rate limiting.

SQL injection attempts.

XSS-style inputs.

Malformed webhook.

Concurrent resource allocation.

Accessibility audit.

Git:

`feat(phase-14): harden platform for production`

Push.

======================================================================
PHASE 15: DOCKER AND RAILWAY DEPLOYMENT
======================================================================

Production deployment target:

Railway

Deployment architecture:

Web application service
Managed PostgreSQL
Optional additional services only when genuinely required

Do NOT deploy PostgreSQL as a disposable application container for production if Railway managed PostgreSQL is available.

Docker:

Create production-grade Dockerfile.

Use multi-stage build.

Run as non-root where practical.

Use production dependencies only.

Implement health endpoint.

Configure graceful shutdown.

Do not bake secrets into image.

Create `.dockerignore`.

Create local `docker-compose.yml` for development.

Include:

App

PostgreSQL

Optional Redis only if actually required by implemented functionality

Production:

Railway should build from GitHub.

Use Dockerfile.

Use environment variables.

Database connection through Railway-managed PostgreSQL.

Create migration strategy.

Do not run destructive migrations automatically.

Use safe migration commands.

Add deployment healthcheck.

Configure start command.

Document required environment variables.

Create:

`.env.example`

`Dockerfile`

`docker-compose.yml`

`railway.toml` or equivalent only after validating current Railway schema.

Tests:

Docker build.

Docker run.

Database connection.

Migration.

Seed.

Healthcheck.

Production build.

Railway deployment smoke check where credentials/environment permit.

Git:

`feat(phase-15): productionize Docker and Railway deployment`

Push.

======================================================================
PHASE 16: FINAL QA
======================================================================

Run the entire test suite.

Run:

lint

typecheck

unit tests

integration tests

E2E tests

production build

Docker build

Docker startup

database migrations

seed

security checks

accessibility checks

SEO checks

broken-link checks

mobile checks

desktop checks

Run Playwright against:

Homepage

Tour listing

Tour detail

Safari builder

Quote

Reservation

Login

Customer portal

Admin dashboard

Booking calendar

Admin booking creation

Admin resource assignment

Payment mock flow

======================================================================
17. FINAL ACCEPTANCE TESTS
======================================================================

The application is not complete until all of the following are true.

PUBLIC EXPERIENCE

[ ] Homepage loads.

[ ] Hero is premium and responsive.

[ ] Navigation works.

[ ] Kenya tours work.

[ ] Tanzania tours work.

[ ] Combined tours work.

[ ] Destination pages work.

[ ] Blog works.

[ ] Contact works.

[ ] SEO metadata works.

[ ] Sitemap exists.

[ ] Mobile experience works.

SAFARI BUILDER

[ ] User can choose destination.

[ ] User can choose dates.

[ ] User can enter travellers.

[ ] User can choose style.

[ ] User can choose preferences.

[ ] User can create itinerary.

[ ] User can modify itinerary.

[ ] User can see pricing.

[ ] User can review itinerary.

RESERVATIONS

[ ] User can create booking.

[ ] Guest reservation works.

[ ] Customer account works.

[ ] Booking reference generated.

[ ] Holds work.

[ ] Holds expire.

[ ] Conflicting resources cannot be double booked.

[ ] Cancellation works.

[ ] Booking state transitions are protected.

PAYMENTS

[ ] Mock payment works.

[ ] Duplicate webhook is harmless.

[ ] Payment is associated with booking.

[ ] Deposit works.

[ ] Balance works.

[ ] Receipt exists.

CUSTOMER PORTAL

[ ] Customer can see only own data.

[ ] Safari timeline works.

[ ] Digital passport works.

[ ] Documents work.

[ ] Payment state works.

[ ] Checklist works.

[ ] In-trip view works.

ADMIN

[ ] Admin authentication works.

[ ] Roles work.

[ ] Bookings work.

[ ] Calendar works.

[ ] Vehicles work.

[ ] Guides work.

[ ] Accommodation works.

[ ] Activities work.

[ ] Transfers work.

[ ] Quotes work.

[ ] Payments work.

[ ] Audit logs work.

INFRASTRUCTURE

[ ] Docker build works.

[ ] Docker container starts.

[ ] PostgreSQL migrations work.

[ ] Production build works.

[ ] Healthcheck works.

[ ] Railway deployment configuration is valid.

[ ] Environment variables documented.

[ ] No secret is committed.

======================================================================
18. GIT WORKFLOW
======================================================================

After every successful phase:

1. Run:

git status

2. Review all changed files.

3. Run all relevant tests.

4. Run production build.

5. Inspect generated output for obvious errors.

6. Stage only intended changes.

7. Commit using the defined phase commit message.

8. Push to:

origin main

Never:

git push --force

Never use:

git reset --hard

unless explicitly instructed to do so.

Never overwrite user work.

Before every push:

git status

Then push.

After push:

git status

Confirm clean working tree.

======================================================================
19. COMMIT CONVENTION
======================================================================

Use:

chore(phase-0): initialize African Bison platform foundation

feat(phase-1): establish premium African Bison design system and shell

feat(phase-2): build public African Bison travel experience

feat(phase-3): implement structured safari catalogue

feat(phase-4): implement interactive safari builder

feat(phase-5): implement safari pricing and quotation engine

feat(phase-6): implement reservation and availability engine

feat(phase-7): implement payment and transaction infrastructure

feat(phase-8): implement customer safari portal

feat(phase-9): implement group travel workflows

feat(phase-10): implement African Bison operations platform

feat(phase-11): implement content management

feat(phase-12): implement customer notification system

feat(phase-13): implement controlled safari concierge

feat(phase-14): harden platform for production

feat(phase-15): productionize Docker and Railway deployment

chore(phase-16): complete final African Bison QA

======================================================================
20. DOCUMENTATION
======================================================================

Maintain:

README.md

docs/ARCHITECTURE.md

docs/DATABASE.md

docs/BOOKING-FLOW.md

docs/PRICING.md

docs/PAYMENTS.md

docs/DEPLOYMENT.md

docs/SECURITY.md

docs/TESTING.md

docs/ADMIN.md

docs/API.md

docs/CONTENT-MIGRATION.md

Documentation should be updated during the appropriate phase.

Do not wait until the end to write all documentation.

======================================================================
21. REQUIRED DEVELOPER COMMANDS
======================================================================

Provide scripts such as:

dev

build

start

lint

typecheck

test

test:unit

test:integration

test:e2e

test:e2e:ui

db:migrate

db:generate

db:seed

db:reset

docker:build

docker:run

audit

Use the project's actual package manager consistently.

======================================================================
22. CI/CD
======================================================================

Create GitHub Actions.

At minimum:

CI workflow

On pull request/push:

Install dependencies

Lint

Typecheck

Unit tests

Build

Run applicable integration tests

Optionally run Playwright using a test database/container.

Do not make CI depend on production secrets.

CI should fail on:

Type errors

Lint errors

Test failures

Build failures

======================================================================
23. DATABASE ENVIRONMENT STRATEGY
======================================================================

Local development:

PostgreSQL via Docker Compose.

Testing:

Separate test database or disposable PostgreSQL container.

Production:

Railway managed PostgreSQL.

Never point local development at production database by default.

Never run destructive database resets automatically in production.

======================================================================
24. OBSERVABILITY
======================================================================

Implement structured logging.

Every request should have a request ID where practical.

Important backend operations should log:

request ID

actor

operation

status

duration

resource ID

Do not log passwords, secrets, passport numbers, payment credentials, or unnecessary personal information.

Create health endpoint:

/api/health

It should report application health and database connectivity appropriately.

Do not expose sensitive infrastructure information publicly.

======================================================================
25. PREMIUM UX DETAILS
======================================================================

Pay special attention to:

Safari route animation.

Smooth itinerary transitions.

Image transitions.

Calendar interactions.

Sticky quote summary.

Progressive disclosure.

Responsive itinerary timeline.

Map route animations.

Elegant booking confirmation.

Micro-interactions.

Loading transitions.

Skeletons.

Empty states.

Error states.

Confirmation states.

Do not create animations solely for decoration.

Every animation should communicate state, hierarchy, or journey progression.

======================================================================
26. BOOKING CONFIRMATION EXPERIENCE
======================================================================

After successful reservation, show an elegant confirmation.

Example structure:

YOUR JOURNEY IS RESERVED

African Bison Classic Tours

Booking:

ABCT-2026-000104

Kenya + Tanzania

12 days

18 Sep 2026
29 Sep 2026

2 travellers

Deposit:
PAID

Next step:

Complete traveller information.

Actions:

View My Safari

Download Confirmation

Contact African Bison

Do not fabricate final content.

======================================================================
27. INTERNAL BUSINESS LOGIC
======================================================================

Do not assume every tour is instantly bookable.

Support:

AVAILABLE

REQUEST_CONFIRMATION

CUSTOM

SOLD_OUT

UNAVAILABLE

The UI must communicate these clearly.

Example:

AVAILABLE

"Reserve now"

REQUEST_CONFIRMATION

"Request availability"

CUSTOM

"Talk to a safari planner"

SOLD OUT

"Join waitlist"

======================================================================
28. WAITLIST
======================================================================

Implement waitlist architecture.

Fields:

Customer

Tour

Dates

Travellers

Preferences

Created date

Status

When inventory becomes available, staff can contact relevant customers.

Do not automatically promise availability.

======================================================================
29. CUSTOM REQUESTS
======================================================================

Build custom request flow.

Customer can say:

"I want to combine Amboseli, Maasai Mara and Zanzibar."

Capture:

Dates

Travellers

Budget range

Accommodation preference

Interests

Destinations

Activities

Notes

Then create an inquiry.

Internal staff can convert the inquiry into:

Quote

Custom itinerary

Reservation

======================================================================
30. CONTACT / INQUIRY SYSTEM
======================================================================

Public forms must create real inquiries.

Fields:

Name

Email

Phone

Country

Interested destination

Travel dates

Travellers

Message

Preferred contact method

Store inquiry.

Notify staff.

Prevent spam.

Use validation.

======================================================================
31. STAFF WORKFLOW
======================================================================

A staff member should be able to:

Receive inquiry.

Review customer preferences.

Create itinerary.

Select resources.

Create quote.

Send quote.

Place temporary hold.

Receive deposit.

Confirm booking.

Assign guide.

Assign vehicle.

Confirm accommodation.

Confirm transfer.

Prepare customer.

Start trip.

Complete trip.

Close booking.

This is the operational backbone.

======================================================================
32. DO NOT OVERENGINEER THE FIRST VERSION
======================================================================

Do NOT add:

Microservices

Complex event-sourcing

GraphQL unless demonstrably useful

Unnecessary Kubernetes infrastructure

Unnecessary message brokers

Dozens of third-party APIs

Complicated CMS framework

Complicated recommendation AI

AI-generated fake travel reviews

Complex loyalty system

Unnecessary social network features

Build the core system properly first.

======================================================================
33. FUTURE-READY BUT NOT FUTURE-BLOATED
======================================================================

Architect clean extension points for:

Flight booking

WhatsApp Business

SMS

M-Pesa

Card payment

Travel insurance

Dynamic accommodation feeds

Supplier APIs

Currency exchange

CRM

Accounting

Analytics

AI concierge

Customer reviews

Referral program

However:

Do not implement integrations before they are needed.

Create interfaces/adapters.

======================================================================
34. ANALYTICS
======================================================================

Track useful product analytics without violating privacy.

Events:

Tour viewed

Destination viewed

Safari builder started

Safari builder completed

Quote generated

Inquiry submitted

Reservation started

Reservation completed

Payment started

Payment completed

Booking cancelled

Do not send passport information or payment details into analytics.

Create analytics abstraction.

Do not hard-code a vendor into business logic.

======================================================================
35. ADMIN REPORTING
======================================================================

Create useful reports.

Booking volume

Booking status

Revenue

Deposits

Outstanding balances

Upcoming arrivals

Upcoming departures

Resource utilization

Popular destinations

Popular tours

Popular activities

Quote conversion

Cancellation volume

These reports must come from actual data.

Do not present fake analytics.

======================================================================
36. QUALITY BAR
======================================================================

The finished product should feel like a serious commercial application.

A customer should be able to visit the site and think:

"This is a professional safari operator."

Then:

"I can actually plan my trip here."

Then:

"I can reserve the trip here."

Then:

"I can manage the trip here."

And African Bison staff should be able to think:

"I can actually run the business from this platform."

That is the quality bar.

======================================================================
37. FINAL RULE
======================================================================

Do not stop at the first visually impressive screen.

Do not optimize for screenshots.

Build the real product.

The marketing website, safari builder, booking engine, customer portal, and operations dashboard must be built as one coherent system.

Every phase must be tested.

Every successful phase must be committed.

Every successful phase must be pushed to:

Michaelmutunga/African-Bison-Classic-Tours-

The application must remain runnable throughout development.

At the end, provide:

1. Final architecture summary
2. Implemented features
3. Test results
4. Docker instructions
5. Local development instructions
6. Database migration instructions
7. Railway deployment instructions
8. Required environment variables
9. Production checklist
10. Git commit history summary
11. Known limitations
12. Recommended next improvements

Do not claim something is implemented if it is not.

Do not claim tests passed if they did not.

Do not claim Railway deployment succeeded unless it was actually verified.

Start with PHASE 0.
Inspect the repository and live website first.
Then implement the system phase by phase.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
