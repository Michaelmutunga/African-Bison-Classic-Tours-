# TASK: Cinematic front-end redesign of African Bison Classic Tours

You are the lead front-end engineer and art director on an existing, production-ready Next.js codebase (Michaelmutunga/African-Bison-Classic-Tours-). The booking engine, pricing, payments, portal and admin are finished and tested. Your job is a DESIGN, IMAGERY and MOTION revamp of the public experience only.

Before writing any code, read `Agents.md`, then read the Next.js docs under `node_modules/next/dist/docs/` as the Next.js block in that file instructs (this is a newer Next.js than your training data). Leave that auto-generated Next.js block in Agents.md untouched.

---

## 1. DESIGN OVERRIDE (this beats Agents.md and any code comment)

This brief has precedence over every design instruction in `Agents.md` (sections 15 to 19 and 25 especially), over the header comment in `app/globals.css`, and over any design note in the docs. Specifically:

- "No gradients, no glass, no clichés" is REPLACED. Dark scrim gradients are allowed on top of photography and video so text stays readable. Nothing else gets decorative gradients, and glassmorphism stays out.
- "Do not animate everything" is REPLACED by a defined motion system (section 5). Motion is now a core part of the identity, but it must be purposeful and must respect reduced motion.
- The homepage structure in Agents.md section 16 is REPLACED by section 6 below.
- The hero concept is REPLACED by a full-bleed video hero (section 6.1).
- "Max two font families" still holds. Keep Fraunces (display) and Inter (body).
- Sharp, editorial corners stay. No rounded, shadow-heavy SaaS cards.

Everything else in Agents.md STILL APPLIES: no invented business facts, prices, guarantees or reviews; never promise wildlife sightings; security, accessibility, SEO, testing and no-secrets rules; strong typing; no `any`.

Record this override so future sessions obey it: add a "Design Revamp Addendum" section at the end of `Agents.md` (above the auto-generated Next.js block) summarising these overrides, and update the comment at the top of `app/globals.css` to match. Do not delete other content from Agents.md.

## 2. WHAT I FOUND IN THE REPO (verify each, then work from it)

- The homepage (`app/page.tsx`) has no photography at all. Sections are text-only. "Signature journeys" is a dense list of text links, "Nairobi in a day" is a row of badges, the migration section is a flat green box.
- `components/safari-image.tsx` renders a coloured placeholder that says "Photography coming soon". It is used by `TourCard`, `DestinationCard` and `PostCard` in `components/cards.tsx`. `public/` contains only `favicon.svg`.
- `Destination`, `TourProduct` and `BlogPost` in `prisma/schema.prisma` have NO image fields. `MediaAsset` exists but is not linked to anything. Do NOT change the Prisma schema in this task.
- `components/site-header.tsx` is a sticky, near-opaque ivory bar plus a dark utility strip. The mobile menu is a plain dropdown with no focus trap, Escape handling or scroll lock. The header and `ConciergeWidget` are rendered from `app/layout.tsx` for every route, including `/admin`, `/dashboard` and other app areas.
- `app/globals.css` has tokens (ink, ivory, parchment, sand, sand-deep, earth, earth-deep, bark, clay, clay-deep), a type scale with `type-display` topping out at 5rem, `scroll-behavior: smooth` on `html`, and a reduced-motion block that only covers CSS.
- `package.json` has no animation library.
- `lib/security-headers.ts` sets CSP with `media-src 'self'`, `img-src 'self' data: https:`, `font-src 'self' data:`, and no external scripts. A unit test in `tests/security.test.ts` locks this contract.
- `next.config.ts` uses `output: "standalone"` and Docker on Railway.
- Existing Playwright specs constrain the redesign (see section 9).

## 3. DESIGN DIRECTION

Reference: I like the structure and motion of era-residence.com (a real-estate site). Borrow PATTERNS only: one cinematic full-bleed hero with almost no UI on it, huge condensed-feeling serif headlines, sections that change background colour as you scroll, cutout or overlapping imagery that breaks out of its frame, pinned scroll storytelling, a hand-drawn route line, tiny fixed chrome (circular rotating badge, scroll progress), a bold oversized phone number as the closing moment. Do NOT copy their text, imagery, logo, badge artwork or code. Everything must be original and East African: acacia, red earth, dawn light, Land Cruisers, migration, Maasai Mara and Serengeti plains.

Palette stays the existing tokens. You may add at most two new tokens for depth (for example `night` near #0e0d0b and `bark-deep` near #3a2a1c) and a `--scrim` token for media overlays. Alternate sections between ivory, sand, earth-deep, bark-deep and night so the scroll has rhythm instead of one uniform ivory field.

Typography: keep Fraunces and Inter. Load Fraunces with the optical size axis (`axes: ["opsz"]`) so big headlines look refined. Add `type-mega` (about `clamp(3.5rem, 11vw, 10rem)`, weight 300 to 400, tight tracking, line-height near 0.95) and `type-eyebrow`. Keep body text comfortable (no tiny body copy). Add a light-coloured focus ring variant for dark sections.

Copy voice for anything new: human, specific, warm, East African. No filler, no generic travel-brochure phrases, and no em dashes anywhere in new copy.

## 4. IMAGES: I WILL ATTACH THEM, YOU PLACE THEM

I will attach photographs for you to place strategically. Follow this process exactly.

1. Inventory every image I provide. Look at each one (dimensions, orientation, subject, light). If you cannot view images, use filenames and ask me for anything unclear instead of guessing.
2. Copy them into `public/images/` in sensible folders (`hero/`, `destinations/`, `tours/`, `experiences/`, `journal/`, `texture/`) with kebab-case names. Resize sources to a maximum of 2400px on the long edge, strip EXIF and GPS metadata, and keep files reasonably small. Never commit an unprocessed huge original.
3. Create `lib/imagery.ts`: a typed manifest of `{ id, src, alt, width, height, focal ("50% 40%" style), orientation, slots: string[], credit }`. Write accurate, useful alt text from what you actually see. Do not name a park, species or place unless it is clearly identifiable from the image or the filename. Default `credit` to `"African Bison Classic Tours"` and flag it `// TODO confirm credit` so I can correct it.
4. Because the database has no image fields, map images to content by slug in the manifest (for example `tours.byCategory`, `destinations.bySlug`, `posts.bySlug`, plus named slots like `hero.primary`, `migration.scene`, `statement.break`, `closing.background`). Provide a helper such as `imageForTour(slug, category)`, `imageForDestination(slug)`, `imageForPost(slug)` that returns an image or `null`.
5. Placement rules: hero gets the strongest wide, high-light image. Destination and tour cards get an image only when its content genuinely fits that destination or category. A generic wildlife or landscape image may fill generic slots (statement break, journal cards, section backgrounds, texture) but must NOT be used to imply a specific park it does not show. Spread images across the site so the same photo is not repeated on one screen. Vary crops and aspect ratios (some tall, some wide) so it feels editorial.
6. Upgrade `SafariImage` to accept an optional `src`, `focal` and `priority`, using `next/image` with correct `sizes`, while keeping its current props working so nothing breaks. Slots with no image keep a graceful placeholder, but restyle it so it looks intentional (subtle texture, no visible "Photography coming soon" on hero-level slots).
7. Add `images.formats: ["image/avif", "image/webp"]` in `next.config.ts` if appropriate. Make sure `sharp` is available in production, and verify the standalone Docker image still serves optimised images (check `Dockerfile`).
8. Write `docs/IMAGERY.md`: a table of every image, where it is used, its alt text, and its credit status. In your final report, list images you could not place and slots that still need photography, so I know what to send next.
9. Do not hotlink, do not fetch stock imagery from the internet, and do not add remote image hosts. Only use what I attach.

Hero video: use a self-hosted file at `public/video/hero.mp4` (plus optional `hero.webm` and a `hero-poster.jpg`). CSP requires `media-src 'self'`, so do NOT loosen CSP to allow external video. If I have not provided a video yet, build `HeroMedia` so it works with a still hero image (slow Ken Burns zoom) and switches to video automatically once the file exists, with no code change. If I supply a video, compress it (no audio track, about 1280px wide, 24fps, target under 4 MB per file), for example:
`ffmpeg -i in.mp4 -an -vf "scale=1280:-2,fps=24" -c:v libx264 -crf 28 -preset slow -movflags +faststart public/video/hero.mp4`
Warn me if the final file is larger than 5 MB.

## 5. MOTION SYSTEM

Add dependencies `motion` (Motion for React, import from `motion/react`) and `lenis`. Do NOT add GSAP. Do pinning with CSS `position: sticky` plus Motion's `useScroll`/`useTransform`. Use `LazyMotion` with `domAnimation` to keep the bundle small. Keep pages as server components; put motion in small client leaf components under `components/motion/`:

- `SmoothScroll`: Lenis provider. Disabled when reduced motion is on and on `/admin`, `/dashboard`, `/my-safaris`, `/safari`, `/profile`, `/builder`, `/login`, `/register`, `/invite`. Remove `scroll-behavior: smooth` from `html` when Lenis is active (they conflict) and keep it only as the reduced-motion and anchor fallback.
- `Reveal`: fade and rise on enter, once, with optional stagger.
- `RevealText`: line-by-line or word-by-word masked text reveal for headlines. Text must stay in the DOM and readable by screen readers as one string.
- `ScrollWords`: statement sentence whose words brighten as you scroll (scroll-linked).
- `Parallax`: gentle image parallax (about 6 to 10 percent) and slow scale.
- `DrawPath`: SVG route line that draws itself on scroll.
- `ScrollProgress`: slim progress indicator (fixed, tiny).
- `WelcomeIntro`: homepage preloader (below).
- `PageIntro`: lighter welcome for inner pages (below).

Add easing and duration tokens (one slow expo-out curve, for example `cubic-bezier(0.16, 1, 0.3, 1)`, and 3 duration steps) so every animation feels like one family.

Welcome animation rules:
- Homepage: a short overlay where the badge draws in, a tagline appears, then a curtain lifts to reveal the hero while the headline reveals line by line. Total 1.8 seconds maximum. Play once per session (use `sessionStorage` inside try/catch). Skip it entirely for reduced motion.
- It is an OVERLAY on top of real content. Never hide the page content or the `h1` with `display: none` or `visibility: hidden`, never block interaction after it ends, and never cause layout shift or delay the hero poster paint.
- Inner pages ("essential pages"): `/tours`, `/tours/[slug]`, `/destinations`, `/destinations/[slug]`, `/experiences`, `/about`, `/contact`, `/blog`, `/faq`, `/travel-information`. Build `PageIntro` into `components/marketing-shell.tsx` and the detail-page heroes: headline mask reveal (about 0.8s) and the hero image easing from scale 1.08 to 1. No preloader on inner pages.

Reduced motion and data-saving: honour `prefers-reduced-motion` in JS (not just CSS): no Lenis, no parallax, no pinned choreography, no video, no preloader, content simply visible. Also fall back to the still image when `navigator.connection.saveData` is on or the connection type is 2g or 3g.

## 6. HOMEPAGE (`app/page.tsx`)

Keep the server data fetching (`getPublishedTours`, `publicDestinations`, `publicPostSummaries`) and keep `export const dynamic = "force-dynamic"` for now. Keep ALL existing copy and links. New order:

1. HERO. Full-viewport `HeroMedia` (looping muted video or the still image), dark scrim, one `h1` (keep "East African safaris, designed around you." and the "Your Africa. Your way." eyebrow), the existing subcopy, and the two existing CTAs ("Design your safari", "Explore safaris"). Video needs `muted loop playsInline autoPlay aria-hidden`, `preload="metadata"`, a `poster`, pause when offscreen or tab hidden, and a small accessible pause/play button (autoplaying motion longer than 5 seconds needs a pause control). A scroll cue at the bottom.
2. STATEMENT. One large sentence that reveals word by word as you scroll, on ivory. Suggested idea: private journeys planned by people who know the ground. Keep it factual.
3. SIGNATURE JOURNEYS. One large featured itinerary (choose the first published tour of the first category) plus image cards per category in a horizontally scrolling row. Big title, small duration and category. Keep every existing link to `/tours/[slug]` and `/tours?category=...`, and keep "No prices, quote on request".
4. MIGRATION SCENE. Full-bleed image, pinned with `position: sticky`. Captions change with scroll progress. KEEP the existing copy and its honesty ("typically July to October", "we plan around the season, never promise a crossing"). On mobile or short screens degrade to a normal stacked layout.
5. ROUTE LINE. A `DrawPath` SVG linking Nairobi, Amboseli, Lake Naivasha, Lake Nakuru, Masai Mara, Serengeti and Ngorongoro (only destinations that exist in the catalogue). Label it schematic. No invented distances or drive times. CTA to `/builder`.
6. DESTINATIONS. An asymmetrical image grid or drag/scroll carousel with parallax instead of the uniform four-column grid. Derive the count ("Sixteen parks..." and "Six experiences...") from `destinations.length` and `experiences.length` instead of hardcoding.
7. NAIROBI IN A DAY. Image tiles for each experience with a hover and focus reveal, replacing the badges. Links still go to `/experiences`.
8. TRUST STRIP (only verified facts). Use facts already in the repo or site: based at JKIA Nairobi, private and independent, plus data-derived counts. NO invented awards, ratings, certifications or reviews.
9. JOURNAL. Three post cards with imagery.
10. CLOSING. Deep `night` or `bark-deep` section with the phone number set enormous, the address, the email and the "Design your safari" CTA. Pull contact details from where the site already sources them (site settings or constants); do not retype them in multiple places.

Keep the homepage with more than 10 unique internal links and exactly one `h1`.

## 7. HEADER AND FOOTER

- Header: transparent with light text over the hero (homepage and any page with an image hero), switching to the solid ivory style after scrolling past a threshold. Everywhere else (admin, portal, auth, builder) keep the current solid header by branching on `usePathname`. Collapse or remove the dark utility strip on scroll and make sure the phone number stays reachable (menu and footer).
- Nav: drop "Home" from the desktop bar (the logo does that), keep Safaris, Destinations, Experiences, Journal, About, Contact, plus the persistent "Design your safari" button.
- Replace the two-line text logo with an ORIGINAL circular SVG badge (text on a path, slow rotation, reduced-motion safe). It doubles as the favicon source and preloader mark.
- Mobile: full-screen overlay menu with large Fraunces links and a staggered reveal. Add Escape to close, focus trap, body scroll lock, `aria-expanded`, `aria-controls` pointing at an id that always exists, and return focus to the trigger on close.
- Footer: keep all existing links and content (read `components/site-footer.tsx` first), restyle to match the closing section.
- Keep the skip link, `aria-current`, and the concierge widget working and not overlapped by new fixed elements.

## 8. INNER PAGES

Recompose each with imagery and rhythm, keeping all data, copy and required text:
- `/tours` and `/destinations`: image cards, calmer grid, entry motion.
- `/tours/[slug]`: large hero image with title overlay, sticky day rail with progress, day-by-day reveal. Keep the headings "Day by day", "Included", "Not included" and the "Request this safari" link exactly as they are.
- `/destinations/[slug]`: hero image, highlights layout, related tours with images.
- `/experiences`: image tiles.
- `/blog` and posts: image cards, readable article layout.
- `/about`, `/contact`, `/faq`, `/travel-information`: quiet, editorial, generous whitespace. Do not change form behaviour on `/contact`; the form must keep `data-ready="true"` and the same labels and button text.
- Do NOT add scroll choreography to the builder, portal, admin, group invite or auth pages. They only inherit the new tokens.

## 9. HARD CONSTRAINTS FROM THE EXISTING TEST SUITE

Do not break these (read `e2e/phase2.spec.ts`, `e2e/smoke.spec.ts`, `e2e/responsive.spec.ts` before starting):
- Every public route must render exactly ONE visible `h1`. A hidden or duplicated `h1` fails strict-mode assertions.
- The homepage must keep more than 10 unique internal links, and all must return status below 400.
- Tour detail pages must show no text matching `$` followed by a digit.
- Contact form selectors and messages stay the same.
- Do not weaken `lib/security-headers.ts` or `tests/security.test.ts`. No new third-party script or media hosts.
- The dev server is slow on my machine and stalls under heavy load, so do not add heavy dependencies and run targeted e2e specs per phase, then the full suite at the end.
- If the preloader could interfere with tests, prefer setting `reducedMotion: "reduce"` in `playwright.config.ts` for the existing specs and cover motion in a dedicated spec. Change existing tests only when an assertion is genuinely obsolete, and tell me why.

## 10. NEW TESTS TO ADD

- `e2e/redesign.spec.ts`: hero renders on desktop and mobile; hero video has `muted`, `playsinline`, `loop` and is `aria-hidden`; pause button works; reduced-motion path shows still image and no preloader; preloader never hides the `h1`; mobile menu opens, traps focus, closes on Escape and restores focus; every `img` has non-empty alt (or is explicitly decorative); no `$digit` text on public pages.
- Unit test for `lib/imagery.ts`: every `src` exists on disk, every image has alt text and dimensions, ids are unique, helper functions return `null` gracefully.
- Run `axe-core` on the redesigned routes (it is already a dev dependency) and fix contrast issues, especially text over photography.

## 11. PERFORMANCE AND ACCESSIBILITY BUDGET

- LCP image or poster gets `priority`; below-the-fold images lazy load; always set `sizes` and aspect ratios to avoid layout shift.
- Motion code loads only where used. No animation libraries in the admin or portal bundles.
- Text over media must meet WCAG AA contrast using the scrim.
- Pinned and parallax sections must never trap keyboard focus or hide focusable content.
- Mobile is recomposed, not shrunk: simpler pinned scenes, cropped hero video focal point, thumb-friendly menu.

## 12. HOW TO WORK

Work on a new branch `redesign/cinematic-ui` (this overrides the "push to main" rule in Agents.md for this task, because Railway deploys from main). Use these phases. After each one: lint, typecheck, unit tests, targeted e2e, production build, then commit and push the branch. Never force push, never commit secrets, never overwrite unrelated work.

- R1: tokens, type scale, motion system components, `SmoothScroll`, Agents.md addendum, imagery manifest and `SafariImage` upgrade, image processing. Commit: `feat(redesign-1): tokens, motion system and imagery pipeline`
- R2: header, mobile menu, badge, footer. Commit: `feat(redesign-2): cinematic header, menu and footer`
- R3: homepage (hero, statement, journeys, migration, route line, destinations, Nairobi, trust, journal, closing) and WelcomeIntro. Commit: `feat(redesign-3): cinematic homepage`
- R4: inner pages, cards, PageIntro, tour and destination detail. Commit: `feat(redesign-4): editorial inner pages`
- R5: new tests, axe pass, performance pass, full suite, Docker build check, docs. Commit: `chore(redesign-5): QA, tests and documentation`

## 13. GUARDRAILS

- Do not change the Prisma schema, API routes, pricing, payments, booking, auth, portal or admin logic.
- Do not invent facts, prices, reviews, awards, distances or wildlife guarantees.
- Do not copy era-residence.com text, images, logo or code.
- Keep every existing piece of business copy unless this brief says otherwise.
- Do not claim tests passed unless you ran them.

## 14. FINAL REPORT

When done, report: what changed per phase; the image placement table; images unplaced and slots still needing photography; whether a hero video is in place or the still fallback is active; test results (lint, typecheck, unit, e2e, axe, build, Docker); and recommended follow-ups (add image fields to the schema with an additive migration, link `MediaAsset`, cache the public catalogue reads instead of `force-dynamic`, and swap in the real hero video).

Start by inspecting the repo and my attached images, confirm your understanding in a few lines, then begin R1.