import { getDestinationBySlug, getTourBySlug, listDestinations, listTours } from "@/server/catalogue";
import { cachedPublic } from "@/lib/public-cache";

/**
 * Public catalogue reads (Phase 3). Always published-only: drafts never leak.
 * Pages using these are `force-dynamic` because Docker/CI builds have no
 * database available at build time.
 */

export interface PublicCategory {
  slug: string;
  label: string;
  count: number;
}

export interface PublicTourSummary {
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  durationDays: number;
  excerpt: string;
}

export interface PublicDestinationSummary {
  slug: string;
  name: string;
  country: string;
  excerpt: string;
}

function toSummary(tour: {
  slug: string;
  title: string;
  durationDays: number;
  excerpt: string;
  category: { slug: string; name: string };
}): PublicTourSummary {
  return {
    slug: tour.slug,
    title: tour.title,
    categorySlug: tour.category.slug,
    categoryLabel: tour.category.name,
    durationDays: tour.durationDays,
    excerpt: tour.excerpt,
  };
}

export type PublishedTourRow = Awaited<ReturnType<typeof listTours>>[number];

/**
 * The single published-tour fetch. Pages must call this ONCE per request and
 * derive categories, counts and filtered lists with the pure helpers below.
 * Calling publicCategories() + publicTourCount() + publicTours() per category
 * issued one full table scan per call (~65-150ms each, ~1.6s combined on the
 * homepage) — that N+1 pattern was the main page-load bottleneck.
 */
export async function getPublishedTours(): Promise<PublishedTourRow[]> {
  return cachedPublic("published-tours", () => listTours({ publishedOnly: true }));
}

export function deriveCategories(tours: PublishedTourRow[]): PublicCategory[] {
  const map = new Map<string, PublicCategory>();
  for (const tour of tours) {
    const entry = map.get(tour.category.slug) ?? {
      slug: tour.category.slug,
      label: tour.category.name,
      count: 0,
    };
    entry.count += 1;
    map.set(tour.category.slug, entry);
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

export function summarizeTours(
  tours: PublishedTourRow[],
  categorySlug?: string,
): PublicTourSummary[] {
  return tours
    .filter((tour) => !categorySlug || tour.category.slug === categorySlug)
    .map(toSummary)
    .sort((a, b) => a.durationDays - b.durationDays || a.title.localeCompare(b.title));
}

export function toursForDestinationName(
  tours: PublishedTourRow[],
  destinationName: string,
): PublicTourSummary[] {
  const token =
    destinationName
      .replace(/^(Mount|Lake)\s+/i, "")
      .split(/[\s-]+/)[0]
      ?.toLowerCase() ?? "";
  if (!token || token.length < 4) return [];
  const variants = token === "maasai" ? ["maasai", "masai"] : [token];
  return tours
    .filter((tour) => variants.some((v) => tour.title.toLowerCase().includes(v)))
    .slice(0, 6)
    .map(toSummary);
}

export async function publicCategories(): Promise<PublicCategory[]> {
  return deriveCategories(await getPublishedTours());
}

export async function publicTours(categorySlug?: string): Promise<PublicTourSummary[]> {
  return summarizeTours(await getPublishedTours(), categorySlug);
}

export async function publicTour(slug: string) {
  return getTourBySlug(slug, true);
}

export async function publicTourCount(): Promise<number> {
  const tours = await getPublishedTours();
  return tours.length;
}

export async function publicDestinations(): Promise<PublicDestinationSummary[]> {
  const destinations = await cachedPublic("published-destinations", () => listDestinations(true));
  return destinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    country: d.country,
    excerpt: d.excerpt,
  }));
}

export async function publicDestination(slug: string) {
  return getDestinationBySlug(slug, true);
}

export async function publicDestinationHighlights(slug: string): Promise<string[]> {
  const destination = await getDestinationBySlug(slug, true);
  return destination.highlights;
}

export async function publicToursForDestination(
  destinationName: string,
): Promise<PublicTourSummary[]> {
  return toursForDestinationName(await getPublishedTours(), destinationName);
}
