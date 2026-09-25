import Link from "next/link";
import { DestinationCard, PostCard } from "@/components/cards";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Container, SectionHeading } from "@/components/ui/layout";
import {
  publicCategories,
  publicDestinations,
  publicTourCount,
  publicTours,
} from "@/lib/catalog";
import { experiences, posts } from "@/lib/content";

// Public catalogue reads need the database at request time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, destinations, tourCount] = await Promise.all([
    publicCategories(),
    publicDestinations(),
    publicTourCount(),
  ]);
  const latestPosts = posts.slice(0, 3);
  const featuredDestinations = destinations.slice(0, 8);

  return (
    <>
      <section className="bg-ink text-ivory">
        <Container className="py-16 sm:py-24">
          <p className="type-label text-sand">Your Africa. Your way.</p>
          <h1 className="type-display mt-4 max-w-4xl text-balance">
            East African safaris, designed around you.
          </h1>
          <p className="type-body mt-5 max-w-2xl text-ivory/75">
            Private Kenya and Tanzania journeys — Mara river crossings, Amboseli
            elephants beneath Kilimanjaro, the Serengeti plains. Planned with
            people who know the ground.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/builder" variant="accent" size="lg">
              Design your safari
            </ButtonLink>
            <ButtonLink
              href="/tours"
              size="lg"
              className="border border-ivory/30 text-ivory hover:border-ivory hover:bg-ivory/10"
            >
              Explore safaris
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Signature journeys"
          title="Safaris with day-by-day itineraries"
          lede="Every journey below is a real itinerary we operate — open one to see each day, what is included, and what is not."
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {await Promise.all(
            categories.map(async (category) => {
              const list = (await publicTours(category.slug)).slice(0, 3);
              return (
                <section key={category.slug} aria-label={category.label}>
                  <div className="flex items-baseline justify-between gap-4 border-b border-ink/15 pb-2">
                    <h2 className="type-h3">{category.label}</h2>
                    <Link
                      href={`/tours?category=${category.slug}`}
                      className="type-small whitespace-nowrap underline underline-offset-4 hover:text-clay-deep"
                    >
                      All {category.count} →
                    </Link>
                  </div>
                  <ul className="divide-y divide-ink/10">
                    {list.map((tour) => (
                      <li key={tour.slug} className="py-3">
                        <Link
                          href={`/tours/${tour.slug}`}
                          className="type-small font-medium hover:text-clay-deep"
                        >
                          {tour.title}
                        </Link>
                        <p className="type-caption text-ink/60">
                          {tour.durationDays} day{tour.durationDays === 1 ? "" : "s"} ·{" "}
                          {tour.categoryLabel}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            }),
          )}
        </div>
        <p className="type-small mt-6 text-ink/70">
          {tourCount} published itineraries. Pricing is quoted per trip —{" "}
          <Link href="/contact" className="underline underline-offset-4">
            ask for a quote
          </Link>
          .
        </p>
      </Container>

      <section className="border-y border-ink/10 bg-earth-deep text-ivory">
        <Container className="py-14 sm:py-20">
          <p className="type-label text-sand">The great migration</p>
          <h2 className="type-h2 mt-2 max-w-3xl text-balance">
            Two million wildebeest between the Serengeti and the Mara, typically
            crossing the Mara River from July to October.
          </h2>
          <p className="type-body mt-4 max-w-2xl text-ivory/75">
            River crossings are a highlight of the migration season — but
            wildlife moves on its own schedule. We plan around the season, never
            promise a crossing.
          </p>
          <div className="mt-6">
            <ButtonLink
              href="/tours?category=kenya-tanzania"
              variant="accent"
              className="border border-ivory/20"
            >
              Migration-season safaris
            </ButtonLink>
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Destinations"
          title="Where the journeys go"
          lede="Sixteen parks, reserves, lakes and mountains across Kenya and Tanzania."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredDestinations.map((destination) => (
            <DestinationCard key={destination.slug} destination={destination} />
          ))}
        </div>
        <p className="mt-6">
          <Link href="/destinations" className="type-small underline underline-offset-4 hover:text-clay-deep">
            All destinations →
          </Link>
        </p>
      </Container>

      <section className="border-y border-ink/10 bg-parchment">
        <Container className="py-14 sm:py-20">
          <SectionHeading
            eyebrow="Nairobi in a day"
            title="Start or end with the city"
            lede="Six experiences within reach of Jomo Kenyatta International Airport."
          />
          <div className="mt-6 flex flex-wrap gap-2">
            {experiences.map((experience) => (
              <Link key={experience.slug} href="/experiences">
                <Badge tone="sand">{experience.name}</Badge>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-20">
        <SectionHeading
          eyebrow="Journal"
          title="Planning guides and field notes"
          lede={`${posts.length} articles on seasons, costs, packing, photography and destinations.`}
        />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {latestPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
        <p className="mt-6">
          <Link href="/blog" className="type-small underline underline-offset-4 hover:text-clay-deep">
            All articles →
          </Link>
        </p>
      </Container>

      <section className="bg-ink text-ivory">
        <Container className="py-14 text-center sm:py-20">
          <h2 className="type-h2 mx-auto max-w-2xl text-balance">
            Tell us the trip you are dreaming of. We will design it.
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
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
