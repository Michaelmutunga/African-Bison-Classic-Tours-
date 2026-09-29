/**
 * Imagery manifest (cinematic revamp R1).
 *
 * The Prisma schema has no image fields and MediaAsset is not linked to
 * anything, so the schema stays untouched in this revamp. Images map to
 * content by slug here instead.
 *
 * - IMAGES: processed files that exist under public/images/. Every entry
 *   is validated by tests/imagery.test.ts (src on disk, alt, dims).
 * - SLOT_PLAN: where the 58 attached client photos go once processed.
 *   Planned only, never rendered, so helpers stay null-safe until files
 *   land. Generic images never imply a specific park.
 */

export interface ImageEntry {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  /** CSS object-position, e.g. "50% 40%". */
  focal: string;
  orientation: "landscape" | "portrait" | "square";
  slots: string[];
  /** Defaults to "African Bison Classic Tours". Keep the TODO until confirmed. */
  credit: string;
}

/** Processed, on-disk registry. Empty until originals are processed. */
export const IMAGES: ImageEntry[] = [];

const byId = new Map(IMAGES.map((image) => [image.id, image]));

export function imageById(id: string): ImageEntry | null {
  return byId.get(id) ?? null;
}

export function imageForSlot(slot: string): ImageEntry | null {
  return IMAGES.find((image) => image.slots.includes(slot)) ?? null;
}

const toursByCategory: Record<string, string> = {};
const destinationsBySlug: Record<string, string> = {};
const postsBySlug: Record<string, string> = {};

export function imageForTour(
  slug: string,
  category: string,
): ImageEntry | null {
  return (
    imageForSlot(`tours/${slug}`) ??
    (category ? imageForSlot(`tours/category/${category}`) : null)
  );
}

export function imageForDestination(slug: string): ImageEntry | null {
  const slot = destinationsBySlug[slug];
  return slot ? imageForSlot(`destinations/${slot}`) : null;
}

export function imageForPost(slug: string): ImageEntry | null {
  const slot = postsBySlug[slug];
  return slot ? imageForSlot(`posts/${slot}`) : null;
}

export function slugsForCategory(category: string): string {
  return toursByCategory[category] ?? "";
}

/**
 * Processing plan for the 58 attached client photos. Each row names the
 * target file, the slot it fills, and honest alt text. Files are NOT
 * committed until resized (max 2400px long edge), EXIF/GPS stripped,
 * and reasonably small. No hotlinking, no stock, no remote hosts.
 */
export interface PlannedImage {
  file: string;
  slot: string;
  alt: string;
  note?: string;
}

export const SLOT_PLAN: PlannedImage[] = [
  {
    file: "hero/balloon-basket-sunrise.jpg",
    slot: "hero.primary",
    alt: "Hot air balloon basket over wildebeest and zebra herds at sunrise",
    note: "Still fallback until public/video/hero.mp4 exists",
  },
  {
    file: "hero/giraffe-zebra-vehicle-sunset.jpg",
    slot: "hero.alternate",
    alt: "Giraffes and zebras beside a safari vehicle at sunset",
  },
  {
    file: "hero/migration-aerial-vehicle.jpg",
    slot: "statement.break",
    alt: "Safari vehicle on a track beside wildebeest and zebra herds",
  },
  {
    file: "tours/migration-river-crossing-sunset.jpg",
    slot: "migration.scene",
    alt: "Wildebeest crossing a river at sunset, seen from above",
  },
  {
    file: "tours/migration-river-bank-line.jpg",
    slot: "tours/category/kenya-tanzania",
    alt: "Wildebeest walking a rocky riverbank during migration season",
  },
  {
    file: "tours/migration-dust-descent.jpg",
    slot: "tours/category/kenya-tanzania",
    alt: "Wildebeest descending a dusty bank toward a river",
  },
  {
    file: "tours/migration-splash-closeup.jpg",
    slot: "tours/category/kenya-tanzania",
    alt: "Wildebeest splashing through river water at close range",
  },
  {
    file: "tours/balloon-over-herds.jpg",
    slot: "tours/category/kenya-tanzania",
    alt: "Hot air balloon drifting over wildebeest herds",
  },
  {
    file: "tours/balloons-launch-5y-zjr.jpg",
    slot: "tours/category/kenya",
    alt: "Hot air balloons inflating beside safari vehicles at dawn",
  },
  {
    file: "tours/lion-vehicle-plains.jpg",
    slot: "tours/category/kenya",
    alt: "Male lion standing on open plains near a safari vehicle",
  },
  {
    file: "tours/lion-pride-vehicle.jpg",
    slot: "tours/category/kenya",
    alt: "Lion pride resting in green grass beside a safari vehicle",
  },
  {
    file: "tours/zebra-vehicle-dusk.jpg",
    slot: "tours/category/kenya",
    alt: "Zebras walking past a safari vehicle with guests at dusk",
  },
  {
    file: "tours/zebra-river-signed.jpg",
    slot: "journal.generic",
    alt: "Zebra herd wading through a shallow river under acacia trees",
    note: "Visible signature in source, confirm credit",
  },
  {
    file: "tours/bush-breakfast-guests.jpg",
    slot: "journal.generic",
    alt: "Guests eating breakfast outdoors beside a safari vehicle",
  },
  {
    file: "tours/bush-breakfast-spread.jpg",
    slot: "journal.generic",
    alt: "Bush breakfast spread with fruit and coffee before a safari vehicle",
  },
  {
    file: "tours/picnic-maasai-cloth.jpg",
    slot: "journal.generic",
    alt: "Picnic lunch with checked cloth set before a safari vehicle",
  },
  {
    file: "tours/sundowner-red-cushions.jpg",
    slot: "journal.generic",
    alt: "Sundowner setup with red cushions and drinks in open grassland",
  },
  {
    file: "tours/sundowner-acacia-toast.jpg",
    slot: "journal.generic",
    alt: "Guests toasting drinks under an acacia tree beside a safari vehicle",
  },
  {
    file: "tours/vehicle-herd-kay-280l.jpg",
    slot: "journal.generic",
    alt: "Open safari vehicle parked before a grazing wildebeest herd",
  },
  {
    file: "destinations/serengeti-gate.jpg",
    slot: "destinations/serengeti",
    alt: "Serengeti National Park entrance gate with a safari vehicle",
    note: "Third-party wheel covers visible, keep or crop",
  },
  {
    file: "destinations/amboseli-elephants-kilimanjaro.jpg",
    slot: "destinations/amboseli",
    alt: "Elephant herd grazing with snow capped Kilimanjaro behind",
  },
  {
    file: "destinations/amboseli-cheetah-cairn.jpg",
    slot: "destinations/amboseli",
    alt: "Two cheetahs resting on a signed stone cairn in open plains",
  },
  {
    file: "destinations/crater-lake-aerial.jpg",
    slot: "destinations/crater-lake",
    alt: "Crater lake from above with elephants and flamingos at dawn",
    note: "Do not label Ngorongoro until the location is confirmed",
  },
  {
    file: "destinations/flamingo-lake-shore.jpg",
    slot: "destinations/flamingo-lake",
    alt: "Buffalo and gazelles before a lake edged with flamingos",
    note: "Do not claim Nakuru or Manyara until confirmed",
  },
  {
    file: "destinations/rhino-flamingo-shore.jpg",
    slot: "destinations/flamingo-lake",
    alt: "Rhino grazing at a lake edge lined with flamingos",
    note: "Do not claim Nakuru until confirmed",
  },
  {
    file: "destinations/buffalo-flamingo-shallows.jpg",
    slot: "destinations/flamingo-lake",
    alt: "Buffalo resting in shallow water with flamingos behind",
  },
  {
    file: "destinations/flamingos-close.jpg",
    slot: "destinations/flamingo-lake",
    alt: "Flamingos walking through shallow lake water at close range",
  },
  {
    file: "destinations/flamingos-flight.jpg",
    slot: "destinations/flamingo-lake",
    alt: "Flamingos landing on a lake crowded with birds",
  },
  {
    file: "destinations/elephants-river-aerial.jpg",
    slot: "destinations/riverine",
    alt: "Elephants in a wide riverbed seen from above",
  },
  {
    file: "destinations/impala-elephant-waterhole.jpg",
    slot: "destinations/waterhole",
    alt: "Impalas drinking at a waterhole with elephants behind",
  },
  {
    file: "destinations/buffalo-herd-grass.jpg",
    slot: "destinations/savanna",
    alt: "Buffalo herd standing in tall savanna grass",
  },
  {
    file: "destinations/topi-herd-golden.jpg",
    slot: "destinations/savanna",
    alt: "Antelopes grazing in golden grass under acacia trees",
  },
  {
    file: "destinations/elephants-egrets-vehicles.jpg",
    slot: "destinations/savanna",
    alt: "Elephants with egrets in grassland, safari vehicles behind",
  },
  {
    file: "destinations/elephants-forest-edge.jpg",
    slot: "destinations/savanna",
    alt: "Elephants partly hidden in thick green bush",
  },
  {
    file: "destinations/red-elephants-lodge.jpg",
    slot: "destinations/savanna",
    alt: "Elephants walking before a safari lodge and muddy pool",
    note: "Do not name the lodge or park",
  },
  {
    file: "destinations/birdlife-shoreline.jpg",
    slot: "destinations/wetland",
    alt: "Cormorants, storks, hippos and elephants sharing a shoreline",
  },
  {
    file: "destinations/highland-waterfall.jpg",
    slot: "destinations/highlands",
    alt: "Tall waterfall dropping through a green highland gorge",
    note: "Do not claim Aberdares until confirmed",
  },
  {
    file: "destinations/moorland-hikers.jpg",
    slot: "destinations/highlands",
    alt: "Hikers walking moorland between rock towers",
    note: "Confirm Mount Kenya before naming",
  },
  {
    file: "experiences/giraffe-centre-sign.jpg",
    slot: "experiences/giraffe-centre",
    alt: "Giraffe Centre entrance sign in Nairobi Kenya",
  },
  {
    file: "experiences/giraffe-feeding-platform.jpg",
    slot: "experiences/giraffe-centre",
    alt: "Giraffes reaching for food at a raised feeding platform",
  },
  {
    file: "experiences/giraffe-hand-feed.jpg",
    slot: "experiences/giraffe-centre",
    alt: "Giraffe taking food from a visitor's hand at close range",
  },
  {
    file: "experiences/orphan-calves-line.jpg",
    slot: "experiences/elephant-orphanage",
    alt: "Keeper walking with a line of young orphan elephants",
    note: "Confirm Sheldrick naming before publishing",
  },
  {
    file: "experiences/calf-bottle-crowd.jpg",
    slot: "experiences/elephant-orphanage",
    alt: "Young elephant lifting a milk bottle before visitors",
  },
  {
    file: "experiences/calf-bottle-keeper.jpg",
    slot: "experiences/elephant-orphanage",
    alt: "Keeper bottle feeding a young elephant under acacia trees",
    note: "Trust logo on coat, keep or crop",
  },
  {
    file: "experiences/calf-playing-keeper.jpg",
    slot: "experiences/elephant-orphanage",
    alt: "Young elephant playing with a keeper on sandy ground",
    note: "Photographer credit in source, confirm credit",
  },
  {
    file: "experiences/nairobi-museum-entrance.jpg",
    slot: "experiences/nairobi-museum",
    alt: "Nairobi National Museum entrance with a metal sculpture",
  },
  {
    file: "experiences/nairobi-museum-hall.jpg",
    slot: "experiences/nairobi-museum",
    alt: "Museum hall with elephant, giraffe and zebra displays",
    note: "Third-party watermark in source, needs clean export",
  },
  {
    file: "experiences/nairobi-museum-culture.jpg",
    slot: "experiences/nairobi-museum",
    alt: "Visitor viewing a cultural display with leopard figures",
  },
  {
    file: "experiences/dancers-baskets-stage.jpg",
    slot: "experiences/bomas",
    alt: "Dancers leaping on stage with baskets and drums",
    note: "Confirm Bomas before naming",
  },
  {
    file: "experiences/dancers-red-costume.jpg",
    slot: "experiences/bomas",
    alt: "Dancers in red and straw costume performing on stage",
    note: "Confirm Bomas before naming",
  },
  {
    file: "experiences/auditorium-red-floor.jpg",
    slot: "experiences/bomas",
    alt: "Empty auditorium with a red stage floor and tiered seats",
    note: "Confirm Bomas before naming",
  },
  {
    file: "experiences/carnivore-carver.jpg",
    slot: "experiences/carnivore",
    alt: "Carver holding roasted meat before a menu board",
  },
  {
    file: "experiences/carnivore-service.jpg",
    slot: "experiences/carnivore",
    alt: "Carver serving roasted meat to a guest at a table",
  },
  {
    file: "journal/trek-hillside-group.jpg",
    slot: "journal.generic",
    alt: "Guided group trekking up a green hillside",
    note: "Do not imply gorilla trekking",
  },
  {
    file: "texture/savanna-dusk.jpg",
    slot: "closing.background",
    alt: "Savanna at sunset with a safari vehicle and wildlife",
  },
];
