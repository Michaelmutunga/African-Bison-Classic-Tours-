import { getDestinationBySlug, getTourBySlug, listDestinations, listTours } from "@/server/catalogue";

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

export async function publicCategories(): Promise<PublicCategory[]> {
  const tours = await listTours({ publishedOnly: true });
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

export async function publicTours(categorySlug?: string): Promise<PublicTourSummary[]> {
  const tours = await listTours({ publishedOnly: true });
  return tours
    .filter((tour) => !categorySlug || tour.category.slug === categorySlug)
    .map(toSummary)
    .sort((a, b) => a.durationDays - b.durationDays || a.title.localeCompare(b.title));
}

export async function publicTour(slug: string) {
  return getTourBySlug(slug, true);
}

export async function publicTourCount(): Promise<number> {
  const tours = await listTours({ publishedOnly: true });
  return tours.length;
}

export async function publicDestinations(): Promise<PublicDestinationSummary[]> {
  const destinations = await listDestinations(true);
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
  const token =
    destinationName
      .replace(/^(Mount|Lake)\s+/i, "")
      .split(/[\s-]+/)[0]
      ?.toLowerCase() ?? "";
  if (!token || token.length < 4) return [];
  const variants = token === "maasai" ? ["maasai", "masai"] : [token];
  const tours = await listTours({ publishedOnly: true });
  return tours
    .filter((tour) => variants.some((v) => tour.title.toLowerCase().includes(v)))
    .slice(0, 6)
    .map(toSummary);
}
