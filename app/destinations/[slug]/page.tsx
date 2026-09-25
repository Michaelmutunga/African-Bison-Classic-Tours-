import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { TourCard } from "@/components/cards";
import { JsonLd, breadcrumbJsonLd } from "@/components/json-ld";
import { SafariImage } from "@/components/safari-image";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/layout";
import {
  publicDestination,
  publicDestinationHighlights,
  publicDestinations,
  publicToursForDestination,
} from "@/lib/catalog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://africanbisonclassictours.com";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  try {
    return (await publicDestinations()).map((d) => ({ slug: d.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const destination = await publicDestination(slug);
    return { title: destination.name, description: destination.excerpt };
  } catch {
    return { title: "Destination not found" };
  }
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let destination;
  let highlights: string[];
  try {
    [destination, highlights] = await Promise.all([
      publicDestination(slug),
      publicDestinationHighlights(slug),
    ]);
  } catch {
    notFound();
  }
  const relatedTours = await publicToursForDestination(destination.name);
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Destinations", href: "/destinations" },
    { label: destination.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(SITE_URL, crumbs)} />
      <Breadcrumbs items={crumbs} />
      <Container className="pt-6">
        <p className="type-label text-clay-deep">{destination.country}</p>
        <h1 className="type-h1 mt-2 max-w-3xl text-balance">{destination.name}</h1>
        <p className="type-body mt-4 text-ink/80">{destination.excerpt}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {highlights.map((highlight) => (
            <Badge key={highlight} tone="sand">
              {highlight}
            </Badge>
          ))}
        </div>
        <SafariImage
          seed={destination.slug}
          label={destination.name}
          alt={`${destination.name} — photo pending`}
          ratio="aspect-[21/9]"
          className="mt-6"
        />
        <h2 className="type-h2 mt-10">Safaris visiting {destination.name}</h2>
        {relatedTours.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedTours.map((tour) => (
              <TourCard key={tour.slug} tour={tour} />
            ))}
          </div>
        ) : (
          <p className="type-small mt-4 text-ink/70">
            No published itinerary names this destination yet —{" "}
            <Link href="/contact" className="underline underline-offset-4">
              ask us to include it
            </Link>
            .
          </p>
        )}
      </Container>
    </>
  );
}
