import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ToursExplorer } from "@/components/tours/tours-explorer";
import { ToursMaskedHero } from "@/components/tours/tours-masked-hero";
import type { ShowcaseTour } from "@/components/tours/showcase";
import { deriveCategories, getPublishedTours, summarizeTours } from "@/lib/catalog";
import { imageForSlot, imageForTourUnique } from "@/lib/imagery";

export const metadata: Metadata = {
  title: "Safari tours",
  description:
    "Kenya, Tanzania and combined safari itineraries with day-by-day plans from African Bison Classic Tours.",
};

export const dynamic = "force-dynamic";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://africanbisonclassictours.com";

export default async function ToursPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  // Single tour-table scan; categories, counts and lists derive in memory.
  const tours = await getPublishedTours();
  const categories = deriveCategories(tours);
  const initialCategory = categories.some((c) => c.slug === category)
    ? (category as string)
    : "all";

  // One image per journey across hero, deck and index: the used-set keeps
  // every photograph distinct without extra requests.
  const heroEntry = imageForSlot("hero.primary");
  const used = new Set<string>();
  if (heroEntry) used.add(heroEntry.id);
  const showcase: ShowcaseTour[] = summarizeTours(tours).map((tour) => {
    const image = imageForTourUnique(tour.slug, tour.categorySlug, used);
    return {
      slug: tour.slug,
      title: tour.title,
      categorySlug: tour.categorySlug,
      categoryLabel: tour.categoryLabel,
      durationDays: tour.durationDays,
      excerpt: tour.excerpt,
      image: image
        ? { src: image.src, alt: image.alt, focal: image.focal }
        : null,
    };
  });

  const days = showcase.map((tour) => tour.durationDays);
  const minDays = days.length > 0 ? Math.min(...days) : null;
  const maxDays = days.length > 0 ? Math.max(...days) : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Safari tours",
          itemListElement: showcase.map((tour, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: tour.title,
            url: `${SITE_URL}/tours/${tour.slug}`,
          })),
        }}
      />
      <ToursMaskedHero
        image={
          heroEntry
            ? {
                src: heroEntry.src,
                alt: heroEntry.alt,
                focal: heroEntry.focal,
              }
            : null
        }
        tourCount={showcase.length}
        regionCount={categories.length}
        minDays={minDays}
        maxDays={maxDays}
      />
      <ToursExplorer
        tours={showcase}
        categories={categories}
        initialCategory={initialCategory}
      />
    </>
  );
}
