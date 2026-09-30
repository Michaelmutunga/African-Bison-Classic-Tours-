import type { PublicDestinationSummary } from "@/lib/catalog";
import { imageForDestination } from "@/lib/imagery";

/**
 * A single tile on the destinations drift wall. Images are local client
 * photography resolved through lib/imagery.ts, never remote hosts.
 */
export interface DriftWallItem {
  image: string;
  title: string;
  subtitle: string;
  href: string;
  alt: string;
}

/**
 * Anchor order spreads the recognisable parks across drift columns. The
 * wall distributes items round-robin, so this ordering keeps Maasai Mara,
 * Serengeti, Amboseli and Ngorongoro in different columns instead of
 * clustering. Destinations without processed photography are left out of
 * the wall and appear in the editorial index below it.
 */
const ANCHOR_ORDER = [
  "masai-mara",
  "serengeti",
  "amboseli",
  "ngorongoro",
  "lake-nakuru",
  "tarangire",
  "lake-naivasha",
  "lake-manyara",
  "samburu",
  "nairobi",
  "aberdares",
  "kilimanjaro",
  "tsavo-east",
  "tsavo-west",
  "lake-bogoria",
  "ol-pejeta",
];

function anchorIndex(slug: string): number {
  const index = ANCHOR_ORDER.indexOf(slug);
  return index === -1 ? ANCHOR_ORDER.length : index;
}

export function buildDriftWallItems(
  destinations: PublicDestinationSummary[],
): DriftWallItem[] {
  return [...destinations]
    .sort((a, b) => anchorIndex(a.slug) - anchorIndex(b.slug))
    .flatMap((destination) => {
      const image = imageForDestination(destination.slug);
      if (!image) return [];
      return [
        {
          image: image.src,
          title: destination.name,
          subtitle: destination.country,
          href: `/destinations/${destination.slug}`,
          alt: image.alt,
        },
      ];
    });
}

/** Destinations with no processed photo yet. Rendered in the index only. */
export function destinationsWithoutWallImage(
  destinations: PublicDestinationSummary[],
): PublicDestinationSummary[] {
  return destinations.filter((d) => !imageForDestination(d.slug));
}
