# Content migration notes (live-site crawl, Sep 2026)

Source: https://africanbisonclassictours.com/ (WordPress).

## Verified business identity (seeded as configurable settings)

- African Bison Classic Tours, Nairobi, Kenya
- JKIA Airport, 1st Floor, Suite 1
- +254 734 466 432 (voice/WhatsApp), +254 111 234 567
- info@africanbisonclassictours.com

## Catalogue observed

- Kenya: 2/3/4/5/6/7/8/10-day safaris (Aberdare, Amboseli, Nakuru, Naivasha,
  Bogoria, Samburu, Tsavo, Sweetwaters, Mara) + Migration + Balloon + Honeymoon.
- Tanzania: 3/4/5/6/7/8-day (Serengeti, Ngorongoro, Tarangire, Manyara).
- Kenya+Tanzania: 7/8/9/10/12-day + newer 14/15-day variants.
- 1-day Nairobi: National Park, Museum, Giraffe Centre, Sheldrick Orphanage,
  Carnivore, Bomas.

## Tour page structure (maps to Phase 3 entities)

Title, duration, overview, day-by-day itinerary, accommodation ("or similar"),
meals, transport, park fees, guide, transfers, mineral water, inclusions,
exclusions, optional add-ons, booking CTA.

## Phase 2 migration results

Migrated via `scripts/crawl-tours.ts` and `scripts/crawl-blog.ts`
(polite, 3–4 concurrent requests, retries):

- **43 tour pages** → `data/content/tours.json` with title, duration,
  excerpt, overview, structured day-by-day itinerary, inclusions,
  exclusions, source URL and source timestamp. Day-range headings
  ("Day 3 & 4") are kept source-faithful.
- **59 journal posts** (60 crawled, 1 dropped as too thin) →
  `data/content/posts.json` with title, excerpt, publish date and
  cleaned paragraphs.
- **About page** → `data/content/about.json` (source typo
  "Africa Bison" corrected to the registered "African Bison").
- **16 destinations** (`destinations.json`) and **6 Nairobi day
  experiences** (`experiences.json`) hand-written from verified copy.

Rules applied: typo cleanup (the the, accomodation, …), no invented
prices (tour pages show none), no guaranteed sightings, "or similar"
accommodation honesty note on every tour page. Photography is
placeholder (`SafariImage`) until licensed assets arrive — source pages
were not hotlinked.

