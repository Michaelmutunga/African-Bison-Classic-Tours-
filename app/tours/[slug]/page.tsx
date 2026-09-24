import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { JsonLd, breadcrumbJsonLd } from "@/components/json-ld";
import { SafariImage } from "@/components/safari-image";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Container } from "@/components/ui/layout";
import { Timeline } from "@/components/ui/timeline";
import { categoryLabel, getTour, tours } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://africanbisonclassictours.com";

export async function generateStaticParams() {
  return tours.map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = getTour(slug);
  if (!tour) return { title: "Safari not found" };
  return {
    title: tour.title,
    description: tour.excerpt,
    openGraph: { title: tour.title, description: tour.excerpt, type: "article" },
  };
}

export default async function TourDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tour = getTour(slug);
  if (!tour) notFound();

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Safaris", href: "/tours" },
    { label: tour.title },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(SITE_URL, crumbs)} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: tour.title,
          description: tour.excerpt,
          url: `${SITE_URL}/tours/${tour.slug}`,
          touristType: "Wildlife safari",
          provider: { "@type": "TravelAgency", name: "African Bison Classic Tours" },
        }}
      />
      <Breadcrumbs items={crumbs} />
      <Container className="pt-6">
        <p className="type-label text-clay-deep">{categoryLabel(tour.category)}</p>
        <h1 className="type-h1 mt-2 max-w-3xl text-balance">{tour.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone="sand">
            {tour.durationDays} day{tour.durationDays === 1 ? "" : "s"}
          </Badge>
          <Badge>Private & tailor-made</Badge>
        </div>
        <SafariImage
          seed={tour.slug}
          label={tour.title}
          alt={`${tour.title} — photo pending`}
          ratio="aspect-[21/9]"
          className="mt-6"
        />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div>
            <h2 className="type-h2">Overview</h2>
            {tour.overview.map((para, index) => (
              <p key={index} className="type-body mt-4 text-ink/85">
                {para}
              </p>
            ))}
            {tour.itinerary.length > 0 ? (
              <>
                <h2 className="type-h2 mt-10">Day by day</h2>
                <div className="mt-6">
                  <Timeline
                    entries={tour.itinerary.map((day) => ({
                      id: `day-${day.n}`,
                      marker: `Day ${day.n}`,
                      title: day.title,
                      detail: day.body.split("\n\n").map((para, i) => (
                        <p key={i} className="mt-2 first:mt-1">
                          {para}
                        </p>
                      )),
                    }))}
                  />
                </div>
              </>
            ) : null}
            {tour.includes.length > 0 || tour.excludes.length > 0 ? (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {tour.includes.length > 0 ? (
                  <Card>
                    <CardBody>
                      <h3 className="type-h3">Included</h3>
                      <ul className="type-small mt-3 list-disc space-y-1.5 pl-5 text-ink/80">
                        {tour.includes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                ) : null}
                {tour.excludes.length > 0 ? (
                  <Card>
                    <CardBody>
                      <h3 className="type-h3">Not included</h3>
                      <ul className="type-small mt-3 list-disc space-y-1.5 pl-5 text-ink/80">
                        {tour.excludes.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                ) : null}
              </div>
            ) : null}
            <p className="type-caption mt-6 text-ink/60">
              Accommodation named in itineraries may be substituted with a
              property of similar standard when fully booked — your confirmation
              always states exactly where you are staying. Wildlife sightings
              are never guaranteed.
            </p>
          </div>
          <aside aria-label="Booking">
            <Card className="lg:sticky lg:top-32">
              <CardBody>
                <p className="type-label text-clay-deep">Your journey</p>
                <p className="type-h3 mt-1">{tour.title}</p>
                <p className="type-small mt-2 text-ink/70">
                  {tour.durationDays} day{tour.durationDays === 1 ? "" : "s"} ·{" "}
                  {categoryLabel(tour.category)}
                </p>
                <p className="type-small mt-3 text-ink/70">
                  Priced per trip for your dates, group size and accommodation
                  level. No instant-checkout prices are shown because park fees
                  and lodge rates change by season.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <ButtonLink href={`/contact?tour=${tour.slug}`}>Request this safari</ButtonLink>
                  <ButtonLink href="/tours" variant="secondary">
                    All safaris
                  </ButtonLink>
                </div>
                <p className="type-caption mt-3 text-ink/60">
                  Prefer to talk?{" "}
                  <Link href="tel:+254734466432" className="underline underline-offset-4">
                    +254 734 466 432
                  </Link>
                </p>
              </CardBody>
            </Card>
          </aside>
        </div>
      </Container>
    </>
  );
}
