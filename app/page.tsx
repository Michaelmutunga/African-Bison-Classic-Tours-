import nextDynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";
import { DescentHero } from "@/components/motion/descent-hero";
import { DrawPath } from "@/components/motion/draw-path";
import { Parallax } from "@/components/motion/parallax";
import { PixelImage } from "@/components/motion/pixel-image";
import { Reveal } from "@/components/motion/reveal";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { ScrollWords } from "@/components/motion/scroll-words";
import { WelcomeIntro } from "@/components/motion/welcome-intro";
import { SmoothCursorLazy } from "@/components/motion/smooth-cursor-lazy";
import { SafariImage } from "@/components/safari-image";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/layout";
import {
  deriveCategories,
  getPublishedTours,
  publicDestinations,
  summarizeTours,
} from "@/lib/catalog";
import { publicPostSummaries } from "@/server/content-admin";
import { experiences } from "@/lib/content";
import { imageForDestination, imageForSlot, imageForTourUnique, imagesForSlot } from "@/lib/imagery";
import { SITE_CONTACT } from "@/lib/site-contact";

// Public catalogue reads need the database at request time.
export const dynamic = "force-dynamic";

// Below-fold client JS splits out of the initial bundle: each loads when
// its section scrolls near, so page switches don't evaluate marquee,
// video, or cursor code up front.
const VelocityMarquee = nextDynamic(
  () => import("@/components/motion/velocity-marquee").then((m) => m.VelocityMarquee),
  { loading: () => null },
);
const MigrationScene = nextDynamic(
  () => import("@/components/migration-scene").then((m) => m.MigrationScene),
  {
    loading: () => (
      <section aria-label="The great migration" className="bg-earth-deep text-ivory">
        <div className="h-[52svh] bg-night" aria-hidden="true" />
      </section>
    ),
  },
);
const ROUTE_STOPS = [
  { name: "Nairobi", slug: "nairobi" },
  { name: "Amboseli", slug: "amboseli" },
  { name: "Lake Naivasha", slug: "lake-naivasha" },
  { name: "Lake Nakuru", slug: "lake-nakuru" },
  { name: "Masai Mara", slug: "masai-mara" },
  { name: "Serengeti", slug: "serengeti" },
  { name: "Ngorongoro", slug: "ngorongoro" },
] as const;

const MARQUEE_ITEMS = [
  "Nairobi",
  "Amboseli",
  "Lake Naivasha",
  "Lake Nakuru",
  "Masai Mara",
  "Serengeti",
  "Ngorongoro",
  "Tarangire",
  "Lake Manyara",
];

function heroImage(slot: string, fallbackSlot: string) {
  const image = imageForSlot(slot) ?? imageForSlot(fallbackSlot);
  if (!image) throw new Error(`Homepage hero imagery missing: ${slot}`);
  return image;
}

function SectionFallback({ label }: { label: string }) {
  return (
    <Container className="py-14 sm:py-20" aria-busy="true" aria-label={label}>
      <div className="h-6 w-40 bg-ink/10" aria-hidden="true" />
      <div className="mt-4 h-10 max-w-xl bg-ink/10" aria-hidden="true" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] bg-ink/10" />
        ))}
      </div>
    </Container>
  );
}

async function JourneysSection() {
  // Single tour-table scan; categories/counts derived in memory.
  const tours = await getPublishedTours();
  const categories = deriveCategories(tours);
  const toursByCategory = new Map(categories.map((c) => [c.slug, summarizeTours(tours, c.slug).slice(0, 3)]));
  const tourCount = tours.length;
  const usedJourneyImages = new Set<string>();
  const featured = categories.length > 0 ? (toursByCategory.get(categories[0].slug) ?? [])[0] : undefined;
  const featuredImage = featured
    ? imageForTourUnique(featured.slug, featured.categorySlug, usedJourneyImages)
    : null;

  return (
    <section id="journeys" aria-label="Signature journeys" className="scroll-mt-24 bg-sand/40">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Signature journeys"
          title="Safaris with day-by-day itineraries"
          lede="Every journey below is a real itinerary we operate — open one to see each day, what is included, and what is not."
        />
        {featured ? (
          <Reveal className="mt-8">
            <article className="grid overflow-hidden bg-night text-ivory md:grid-cols-2">
              <PixelImage
                seed={featured.slug}
                label={featured.title}
                alt={featuredImage?.alt ?? `${featured.title} — photo pending`}
                src={featuredImage?.src}
                focal={featuredImage?.focal}
                priority={false}
                quiet
                ratio="aspect-[16/10] md:aspect-auto md:min-h-[22rem]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="flex flex-col justify-center p-8 sm:p-10">
                <p className="type-label text-sand">Featured · {featured.categoryLabel}</p>
                <h3 className="type-h1 mt-2 text-balance">
                  <Link href={`/tours/${featured.slug}`} className="hover:text-sand">
                    {featured.title}
                  </Link>
                </h3>
                <p className="type-small mt-3 text-ivory/70">
                  {featured.durationDays} day{featured.durationDays === 1 ? "" : "s"} · Private & tailor-made
                </p>
                <p className="mt-5">
                  <Link href={`/tours/${featured.slug}`} className="type-small font-semibold underline underline-offset-4 hover:text-sand">
                    View itinerary →
                  </Link>
                </p>
              </div>
            </article>
          </Reveal>
        ) : null}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.flatMap((category) =>
            (toursByCategory.get(category.slug) ?? []).map((tour) => {
              const image = imageForTourUnique(tour.slug, tour.categorySlug, usedJourneyImages);
              return (
                <Reveal key={tour.slug}>
                  <article className="group flex h-full flex-col border border-ink/10 bg-ivory">
                    <Link
                      href={`/tours/${tour.slug}`}
                      aria-label={`View itinerary: ${tour.title}`}
                      className="block"
                    >
                      <PixelImage
                        seed={tour.slug}
                        label={tour.title}
                        alt={image?.alt ?? `${tour.title} — photo pending`}
                        src={image?.src}
                        focal={image?.focal}
                        ratio="aspect-[4/3]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="type-label text-clay-deep">{tour.categoryLabel}</p>
                      <h3 className="type-h3 mt-2 text-balance">
                        <Link href={`/tours/${tour.slug}`} className="group-hover:text-clay-deep">
                          {tour.title}
                        </Link>
                      </h3>
                      <p className="type-caption mt-2 text-ink/60">
                        {tour.durationDays} day{tour.durationDays === 1 ? "" : "s"} · Private & tailor-made
                      </p>
                      <p className="type-small mt-3 line-clamp-2 text-ink/70">{tour.excerpt}</p>
                      <p className="mt-auto pt-4">
                        <Link
                          href={`/tours/${tour.slug}`}
                          className="type-small font-semibold underline underline-offset-4 hover:text-clay-deep"
                        >
                          View itinerary →
                        </Link>
                      </p>
                    </div>
                  </article>
                </Reveal>
              );
            }),
          )}
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/tours?category=${category.slug}`}
                className="type-small underline underline-offset-4 hover:text-clay-deep"
              >
                All {category.count} {category.label} →
              </Link>
            </li>
          ))}
        </ul>
        <p className="type-small mt-6 text-ink/70">
          {tourCount} published itineraries. Pricing is quoted per trip —{" "}
          <Link href="/contact" className="underline underline-offset-4">
            ask for a quote
          </Link>
          .
        </p>
      </Container>
    </section>
  );
}

async function MigrationBlock() {
  const migrationPoster = heroImage("migration.scene", "hero.primary");
  return <MigrationScene poster={migrationPoster} videoSrc="/video/hero.mp4" />;
}

async function DestinationsSection() {
  const destinations = await publicDestinations();
  const featuredDestinations = destinations.slice(0, 8);
  return (
    <section aria-label="Destinations" className="bg-parchment">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Destinations"
          title="Where the journeys go"
          lede={`${destinations.length} parks, reserves, lakes and mountains across Kenya and Tanzania. ${experiences.length} Nairobi experiences alongside.`}
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredDestinations.map((destination, index) => {
            const image = imageForDestination(destination.slug);
            const large = index === 0;
            return (
              <Parallax
                key={destination.slug}
                className={large ? "sm:col-span-2 sm:row-span-2" : undefined}
              >
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="group relative block overflow-hidden bg-night text-ivory"
                >
                  <SafariImage
                    seed={destination.slug}
                    label={destination.name}
                    alt={image?.alt ?? `${destination.name} — photo pending`}
                    src={image?.src}
                    focal={image?.focal}
                    ratio={large ? "aspect-[16/10] sm:aspect-auto sm:h-full sm:min-h-[26rem]" : "aspect-[4/3]"}
                    sizes={large ? "(max-width: 640px) 100vw, 50vw" : "(max-width: 640px) 100vw, 25vw"}
                  />
                  <span className="absolute inset-0" style={{ background: "var(--scrim)" }} aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-5">
                    <span className="type-label text-sand">{destination.country}</span>
                    <span className="type-h3 mt-1 block">{destination.name}</span>
                    <span className="type-small mt-1 line-clamp-2 block text-ivory/75 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      {destination.excerpt}
                    </span>
                  </span>
                </Link>
              </Parallax>
            );
          })}
        </div>
        <p className="mt-6">
          <Link href="/destinations" className="type-small underline underline-offset-4 hover:text-clay-deep">
            All destinations →
          </Link>
        </p>
      </Container>
    </section>
  );
}

async function TrustStrip() {
  const tours = await getPublishedTours();
  return (
    <section aria-label="Why African Bison" className="border-y border-ivory/10 bg-earth-deep text-ivory">
      <Container className="py-14 sm:py-20">
        <p className="type-label text-sand">Why African Bison</p>
        <div className="mt-4 grid gap-8 md:grid-cols-3">
          <div>
            <p className="font-display text-4xl">JKIA, Nairobi</p>
            <p className="type-small mt-2 text-ivory/75">Based at the airport, first floor, suite 1. We meet you at arrivals.</p>
          </div>
          <div>
            <p className="font-display text-4xl">Private</p>
            <p className="type-small mt-2 text-ivory/75">Independent company, private vehicles, tailor-made itineraries.</p>
          </div>
          <div>
            <p className="font-display text-4xl tabular-nums">{tours.length}</p>
            <p className="type-small mt-2 text-ivory/75">Published day-by-day itineraries across Kenya and Tanzania.</p>
          </div>
        </div>
      </Container>
    </section>
  );
}

async function JournalSection() {
  const [allPosts] = await Promise.all([publicPostSummaries()]);
  const latestPosts = allPosts.slice(0, 3);
  const journalPool = imagesForSlot("journal.generic");
  return (
    <section aria-label="Journal" className="bg-ivory">
      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Journal"
          title="Planning guides and field notes"
          lede={`${allPosts.length} articles on seasons, costs, packing, photography and destinations.`}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {latestPosts.map((post, index) => {
            const image = journalPool[index % Math.max(journalPool.length, 1)];
            return (
              <article key={post.slug} className="border border-ink/10">
                <SafariImage
                  seed={post.slug}
                  label={post.title}
                  alt={image?.alt ?? `${post.title} — photo pending`}
                  src={image?.src}
                  focal={image?.focal}
                  ratio="aspect-[16/10]"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="p-5">
                  <h3 className="type-h3">
                    <Link href={`/blog/${post.slug}`} className="hover:text-clay-deep">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="type-small mt-2 line-clamp-3 text-ink/70">{post.excerpt}</p>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6">
          <Link href="/blog" className="type-small underline underline-offset-4 hover:text-clay-deep">
            All articles →
          </Link>
        </p>
      </Container>
    </section>
  );
}

// Hero paints without touching the database (imagery manifest only) so the
// first paint never waits on Postgres; catalogue sections stream below.
export default function HomePage() {
  const heroPrimary = heroImage("hero.primary", "hero.sky");
  const heroMobile = heroImage("hero.primary-mobile", "hero.primary");

  return (
    <>
      <ScrollProgress />
      <SmoothCursorLazy />
      <WelcomeIntro />
      <DescentHero image={heroPrimary} mobileImage={heroMobile} />
      <VelocityMarquee
        label="Safari regions: Nairobi, Amboseli, Lake Naivasha, Lake Nakuru, Masai Mara, Serengeti and Ngorongoro"
        items={MARQUEE_ITEMS}
      />

      <section aria-label="How we plan" className="bg-ivory">
        <Container className="py-20 sm:py-28">
          <ScrollWords
            text="Private journeys, planned by people who know the ground. No queues, no scripts, no rushing."
            className="font-display max-w-4xl text-3xl leading-tight font-medium tracking-tight text-balance sm:text-5xl"
          />
        </Container>
      </section>

      <Suspense fallback={<SectionFallback label="Loading signature journeys" />}>
        <JourneysSection />
      </Suspense>

      <Suspense
        fallback={
          <section aria-label="The great migration" className="bg-earth-deep text-ivory">
            <div className="h-[52svh] bg-night" aria-hidden="true" />
          </section>
        }
      >
        <MigrationBlock />
      </Suspense>

      <section aria-label="A classic route" className="bg-ivory">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="One classic line"
            title="Nairobi to the crater, overland"
            lede="A schematic of the journey most first-time visitors dream about. Your own route can start anywhere."
          />
          <Reveal className="mt-8 text-earth-deep">
            <DrawPath
              d="M20 170 C 140 170, 160 60, 280 90 S 420 180, 540 110 S 700 60, 780 90"
              title="Schematic safari route from Nairobi to Ngorongoro"
            />
          </Reveal>
          <ol className="mt-6 flex flex-wrap gap-2">
            {ROUTE_STOPS.map((stop, index) => (
              <li key={stop.slug} className="flex items-center gap-2">
                {index > 0 ? <span aria-hidden="true" className="text-ink/30">→</span> : null}
                <Link href={`/destinations/${stop.slug}`}>
                  <Badge tone="sand">{stop.name}</Badge>
                </Link>
              </li>
            ))}
          </ol>
          <p className="type-caption mt-4 text-ink/60">
            Schematic route, not to scale. No distances or drive times are shown because conditions change.
          </p>
          <p className="mt-6">
            <ButtonLink href="/builder">Design your safari</ButtonLink>
          </p>
        </Container>
      </section>

      <Suspense fallback={<SectionFallback label="Loading destinations" />}>
        <DestinationsSection />
      </Suspense>

      <section aria-label="Nairobi in a day" className="bg-bark-deep text-ivory">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Nairobi in a day"
            title="Start or end with the city"
            lede="Six experiences within reach of Jomo Kenyatta International Airport."
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((experience) => {
              const image = imageForSlot(`experiences/${experience.slug}`);
              return (
                <Link
                  key={experience.slug}
                  href="/experiences"
                  className="group relative block overflow-hidden bg-night"
                >
                  <SafariImage
                    seed={experience.slug}
                    label={experience.name}
                    alt={image?.alt ?? `${experience.name} — photo pending`}
                    src={image?.src}
                    focal={image?.focal}
                    ratio="aspect-[4/3]"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <span className="absolute inset-0" style={{ background: "var(--scrim)" }} aria-hidden="true" />
                  <span className="absolute inset-x-0 bottom-0 p-5">
                    <span className="type-small font-semibold">{experience.name}</span>
                    <span className="type-small mt-1 line-clamp-2 block text-ivory/75 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      {experience.excerpt}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Container>
      </section>

      <Suspense
        fallback={
          <section aria-label="Why African Bison" className="border-y border-ivory/10 bg-earth-deep text-ivory">
            <Container className="py-14 sm:py-20">
              <div className="h-8 w-48 bg-ivory/10" aria-hidden="true" />
            </Container>
          </section>
        }
      >
        <TrustStrip />
      </Suspense>

      <Suspense fallback={<SectionFallback label="Loading journal" />}>
        <JournalSection />
      </Suspense>

      <section aria-label="Start planning" className="bg-night text-ivory">
        <Container className="py-20 text-center sm:py-28">
          <p className="type-label text-sand">Start planning</p>
          <h2 className="type-h2 mx-auto mt-2 max-w-2xl text-balance">
            Tell us the trip you are dreaming of. We will design it.
          </h2>
          <p className="mt-8">
            <a href={SITE_CONTACT.phoneHref} className="type-mega tabular-nums hover:text-sand">
              {SITE_CONTACT.phoneDisplay}
            </a>
          </p>
          <p className="type-small mt-4 text-ivory/70">
            {SITE_CONTACT.addressLines.join(" · ")} ·{" "}
            <a href={`mailto:${SITE_CONTACT.email}`} className="underline underline-offset-4">
              {SITE_CONTACT.email}
            </a>
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/builder" variant="accent" size="lg">
              Start planning
            </ButtonLink>
            <ButtonLink
              href="/about"
              size="lg"
              className="border border-ivory/30 text-ivory hover:border-ivory hover:bg-ivory/10"
            >
              About African Bison
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
