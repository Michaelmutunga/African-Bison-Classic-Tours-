<!--
Addendum to docs/REDESIGN-PROMPT.md. Replaces the homepage hero (section 6, item 1)
with a scroll-driven "descent" hero. Read docs/REDESIGN-PROMPT.md first, then this file.
Where they conflict, THIS file wins for the homepage hero and the video placement.
-->

# ADDENDUM: The Descent Hero (homepage)

Read `docs/REDESIGN-PROMPT.md` and `Agents.md` first. Everything in the redesign brief still applies (design override, guardrails, test constraints, image pipeline, motion system, phases). This addendum changes ONLY the following:

1. The homepage hero is no longer a video. It becomes a scroll-driven "descent": you start in the sky at sunset, and as you scroll the camera tilts down through cloud, into the treetops and the setting sun, over the savannah, and finally to the wildlife.
2. The hero video moves to a different section (the migration scene, see section 6).
3. The hero typography follows the split-character "poster" style from the StringTune tutorial I attached (`tutorial-10-split.html`): giant uppercase words scattered left and right on a grid, hairline rules between rows, tiny meta labels, letters that slide up one by one, and a parallax image behind. Use it as a design reference for the pattern.

## 1. Implementation decision: build it natively

The tutorial loads StringTune from `unpkg.com`. Our CSP blocks that and must not be loosened. StringTune also rewrites the DOM, which fights React hydration. So:

- Do NOT add a CDN script and do NOT weaken `lib/security-headers.ts`.
- Recreate the pattern natively with our motion system (Motion `useScroll`/`useTransform` plus CSS). Do not copy the tutorial's code or markup verbatim; re-implement the behaviour.
- Only consider installing `@fiddle-digital/string-tune` from npm if you first verify its licence, bundle size and that it works inside a client component without hydration warnings. Default answer: native.

Behaviours to reproduce from the tutorial:
- Character-level split: every character slides up from about 120% below a clipped line, staggered by character index, triggered on entering view (and replaying if it re-enters).
- Parallax image inside a frame with overscan so edges never show.
- Words placed on alternating sides of a grid, separated by 1px hairline rules, with small labels (index numbers, short tag lines, a tiny caption).
- Desktop only: a hovered character inverts colour. Keep AA contrast.

Accessibility for split text: render `<h1><span class="sr-only">Full sentence</span><span aria-hidden="true">...chars...</span></h1>`. There must still be exactly ONE `h1` on the page and it must stay visible (never `display: none` or `visibility: hidden`). Chapter headings after the first are `h2`.

## 2. Images (already in `incoming/`)

My photographs are in the `incoming/` folder (look at the project root first, then `public/incoming/`; ask me if you cannot find it).

1. Inventory and LOOK at every image. Classify each: `sky-clouds`, `sunset-treetops`, `savannah`, `wildlife`, or `other`. Note dimensions, orientation, where the sun sits, and where the horizon or treeline sits.
2. Process them with the pipeline from the main brief (max 2400px long edge, strip EXIF and GPS, kebab-case names, into `public/images/hero/`, register in `lib/imagery.ts` with alt text and focal points). Add slots `hero.sky`, `hero.sunset`, `hero.savannah`, `hero.wildlife`. Do not commit the originals in `incoming/` (check `git status`; add `incoming/` to `.gitignore` if it is not tracked).
3. Do not name a park or species in alt text or captions unless it is clearly identifiable.
4. If a chapter has no fitting image (for example nothing shows treetops with the sun), do NOT fake it. Build the chapter with the best available image, keep the layout working, and list exactly what is missing in your report so I can supply or generate it.
5. Provide portrait crops for mobile via focal points, or separate portrait files if I supplied them.

## 3. The scene: choreography

Build `components/motion/descent-hero.tsx` (client component) inside a tall wrapper with a sticky 100svh stage. Scroll length: about 420vh desktop, about 320vh mobile. Use native scroll only (Lenis smoothing is fine). No wheel hijacking, no scroll snapping that traps the user. Animate only `transform` and `opacity`. Drive everything from one `scrollYProgress` value `p` from 0 to 1.

| Chapter | p range | What the viewer sees |
|---|---|---|
| 1. Sky | 0 to 0.25 | Sunset sky and clouds, slow drift. Giant split headline (the `h1`), subcopy, CTAs, scroll cue. |
| 2. Descent | 0.20 to 0.55 | Camera tilts down: the sky layer moves up and slows, the treetop and sun layer rises into frame faster (depth parallax). The sun glow sinks behind the treeline and dims as `p` increases, and a subtle dusk tint fades in. |
| 3. Savannah | 0.50 to 0.80 | The savannah layer rises in. Horizon settles at about two thirds of the frame. |
| 4. Wildlife | 0.75 to 1.0 | The wildlife layer settles with a very slow push-in. Closing headline and CTAs appear. The stage then unpins and the page scrolls on. |

Details:
- Blend layers with soft vertical mask fades so seams never show. Scrims are allowed under text.
- If I only supplied one or two usable images, use a tall panorama approach or fewer layers, but keep the same four chapters and the same feeling of tilting downward.
- The sun "setting" should read as light and glow moving down behind the treeline (use the sun already in the photo plus a soft glow overlay that moves and fades). Do not draw a fake cartoon sun.
- Preload and decode the later layers after first paint (`requestIdleCallback`, low fetch priority) so nothing pops in mid-scroll. Only the first image gets `priority`.
- Left edge: a tiny fixed rail with chapter numbers 01 to 04 and a progress line. Header is transparent with light text during the hero.
- Inactive chapters must be `inert` and `aria-hidden` (toggle at chapter thresholds, not every frame) so keyboard focus never lands on an offscreen CTA. Add a "Skip to safaris" link that jumps past the hero and is visible on focus.
- Reduced motion, data saving (`saveData`, 2g or 3g) and very short viewports: no pinned scene. Render a static, well designed stack: sky image with the `h1`, subcopy and CTAs, then each chapter as a normal full-width image band with its heading. All content is still there.
- Mobile is recomposed, not shrunk: shorter scroll length, fewer parallax layers, larger tap targets, headline broken into 3 to 4 lines.

## 4. Copy and calls to action

Keep the existing eyebrow, `h1`, subcopy and CTA labels from `app/page.tsx`. Use new copy only where listed. No em dashes, no filler, no invented facts, and never imply a guaranteed sighting. Adjust captions to what the images really show.

**Chapter 1 (the `h1`, split across four grid rows, alternating left and right):**
EAST AFRICAN / SAFARIS, / DESIGNED / AROUND YOU (last row in the clay accent, checked for large-text contrast).
- Eyebrow: "Your Africa. Your way."
- Subcopy: keep the existing Kenya and Tanzania paragraph.
- Tag line at the top of the poster: "Private" / "Independent" / "Kenya and Tanzania" (styled like the tutorial's "Details / Structure / Essence").
- Meta: "01" and "Nairobi, Kenya".
- CTAs: "Design your safari" (primary) and "Explore safaris" (secondary), as now.
- Scroll cue: "Follow the light".

**Chapter 2 (`h2`):** THE LIGHT / TURNS GOLD. Caption: "Early drives, slow afternoons, long golden evenings."

**Chapter 3 (`h2`):** THE PLAINS / OPEN UP. Caption built from data: "{destinations.length} parks, reserves, lakes and mountains across Kenya and Tanzania."

**Chapter 4 (`h2`):** WILD, ON ITS / OWN TIME. Caption: "Wildlife keeps its own schedule. We plan around the season and never promise a sighting."
- CTAs: "Design your safari" (primary), "Explore safaris", and "Talk to a planner" linking to `/contact`.

Keep the homepage at more than 10 unique internal links and exactly one `h1`.

## 5. Sequencing with the welcome intro

Shorten `WelcomeIntro` to about 1.2 seconds. Order: badge curtain lifts, then the chapter 1 characters slide up. It plays once per session and is skipped for reduced motion. It must never hide the `h1` or delay the first image paint.

## 6. Where the video goes now

Remove the video from the hero. Put it in the MIGRATION SCENE section (section 6, item 4 of the main brief) as its full-bleed background, with the existing migration copy and captions over it. Reuse the video requirements from the main brief: self-hosted at `public/video/hero.mp4` (or renamed `migration.mp4`), `muted loop playsInline aria-hidden`, `preload="metadata"`, poster, pause when offscreen or tab hidden, an accessible pause button, still image fallback for reduced motion and data saving. If the video file does not exist yet, the section uses a still image and switches automatically when the file appears.

Updated homepage order: 1 Descent hero, 2 Statement, 3 Signature journeys, 4 Migration scene (video), 5 Route line, 6 Destinations, 7 Nairobi in a day, 8 Trust strip, 9 Journal, 10 Closing.

## 7. Quality bar: 9.5 out of 10

Treat this landing page as a 9.5 out of 10 or it is not done. Prove it, do not assert it.

Measure and report:
- Lighthouse mobile (throttled) for `/`: Performance 90 or higher, Accessibility 100, Best Practices 95 or higher, SEO 100. LCP under 2.5s, CLS under 0.05, no long tasks during the descent.
- 60fps feel while scrolling on a mid-range phone profile (Chrome performance trace or equivalent). Only transform and opacity animate; use `will-change` sparingly.
- axe-core: zero violations on `/`, including contrast of text over photography.
- Keyboard: tab order is sensible, no focus inside inert chapters, skip link works, mobile menu works.
- Screenshots with Playwright at scroll positions 0, 25, 50, 75 and 100 percent, at 1440x900 and 390x844, saved to `docs/screenshots/hero/`. Look at them critically.

Self-score honestly against this rubric (each out of 10, then the average): visual composition, typography and hierarchy, motion smoothness and pacing, imagery integration and colour continuity across chapters, copy quality, mobile experience, accessibility, performance. If any category is below 9, fix it and re-score. In your report show the scores, the evidence, and what would still raise them. Do not report a score you did not measure.

## 8. Tests and workflow

- Add to `e2e/redesign.spec.ts`: `h1` is visible at load and there is exactly one; scrolling advances the chapters (check the active chapter marker or rail); inactive chapters are `inert`; reduced motion shows the static stack with all CTAs present; the hero video element no longer exists in the hero but exists in the migration section; no text matching `$` followed by a digit.
- Existing constraints from the main brief still hold (one visible `h1`, more than 10 internal links, CSP untouched, contact form untouched).
- Work on the `redesign/cinematic-ui` branch. This addendum belongs in phase R3 (homepage). Commit message: `feat(redesign-3): descent hero and video migration scene`. Lint, typecheck, unit tests, targeted e2e and a production build before each push. Never claim a check passed unless you ran it.

## 9. Report back

Give me: what was built, the image classification and placement table, any chapter that lacked a fitting image (so I can supply it), the measured scores and rubric, screenshots location, and anything that deviates from this brief.

Start by finding and viewing the images in `incoming/`, confirm your chapter plan in a few lines, then build.
