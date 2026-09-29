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

/**
 * Processed, on-disk registry. Rebuilt by scripts/process-imagery.mjs
 * (marker block below). Every entry is validated by tests/imagery.test.ts.
 */
// GENERATED:BEGIN
export const IMAGES: ImageEntry[] = [
  {
    "id": "balloon-basket-sunrise",
    "src": "/images/hero/balloon-basket-sunrise.jpg",
    "alt": "Hot air balloon basket carrying guests over wildebeest and zebra herds at sunrise",
    "width": 736,
    "height": 1318,
    "focal": "70% 25%",
    "orientation": "portrait",
    "slots": [
      "hero.primary"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "balloon-over-herds",
    "src": "/images/hero/balloon-over-herds.jpg",
    "alt": "Hot air balloon drifting over a grazing wildebeest herd in golden grass",
    "width": 1080,
    "height": 1620,
    "focal": "50% 55%",
    "orientation": "portrait",
    "slots": [
      "closing.background"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "savanna-sunset-encounter",
    "src": "/images/hero/savanna-sunset-encounter.jpg",
    "alt": "Giraffes and zebras gathered beside a safari vehicle at sunset",
    "width": 1000,
    "height": 1500,
    "focal": "50% 35%",
    "orientation": "portrait",
    "slots": [
      "statement.break"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "migration-river-sunset",
    "src": "/images/hero/migration-river-sunset.jpg",
    "alt": "Wildebeest crossing a river at sunset, seen from above",
    "width": 683,
    "height": 1024,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "migration.scene"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-migration-descent",
    "src": "/images/tours/mara-migration-descent.jpg",
    "alt": "Wildebeest descending a dusty bank toward a river in the Maasai Mara",
    "width": 1200,
    "height": 1486,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya-tanzania"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-game-drive-herd",
    "src": "/images/tours/mara-game-drive-herd.jpg",
    "alt": "Open safari vehicle parked before a grazing wildebeest herd in the Maasai Mara",
    "width": 1000,
    "height": 1500,
    "focal": "50% 45%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "serengeti-river-crossing",
    "src": "/images/tours/serengeti-river-crossing.jpg",
    "alt": "Wildebeest crossing a rocky river in the Serengeti",
    "width": 1200,
    "height": 1500,
    "focal": "50% 55%",
    "orientation": "portrait",
    "slots": [
      "tours/category/tanzania",
      "tours/category/kenya-tanzania",
      "destinations/serengeti"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "serengeti-zebra-river",
    "src": "/images/tours/serengeti-zebra-river.jpg",
    "alt": "Zebra herd wading through a river under acacia trees in the Serengeti",
    "width": 1100,
    "height": 1429,
    "focal": "50% 55%",
    "orientation": "portrait",
    "slots": [
      "tours/category/tanzania"
    ],
    "credit": "Cem Sural // TODO confirm licence"
  },
  {
    "id": "mara-lion-vehicle",
    "src": "/images/tours/mara-lion-vehicle.jpg",
    "alt": "Male lion standing beside a safari vehicle in the Maasai Mara",
    "width": 736,
    "height": 488,
    "focal": "55% 45%",
    "orientation": "landscape",
    "slots": [
      "tours/category/kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-lion-pride",
    "src": "/images/tours/mara-lion-pride.jpg",
    "alt": "Lion pride resting beside a safari vehicle with guests in the Maasai Mara",
    "width": 847,
    "height": 635,
    "focal": "50% 45%",
    "orientation": "landscape",
    "slots": [
      "tours/category/kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-zebras-dusk",
    "src": "/images/tours/mara-zebras-dusk.jpg",
    "alt": "Zebras walking past a safari vehicle with guests at dusk in the Maasai Mara",
    "width": 1200,
    "height": 1500,
    "focal": "50% 60%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya",
      "destinations/masai-mara"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "serengeti-gate",
    "src": "/images/tours/serengeti-gate.jpg",
    "alt": "Safari vehicle passing the Serengeti National Park entrance gate",
    "width": 1200,
    "height": 1200,
    "focal": "50% 60%",
    "orientation": "square",
    "slots": [
      "tours/category/tanzania"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "serengeti-game-drive",
    "src": "/images/tours/serengeti-game-drive.jpg",
    "alt": "Game drive in the Serengeti, Tanzania",
    "width": 768,
    "height": 1376,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/tanzania"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "serengeti-plains",
    "src": "/images/tours/serengeti-plains.jpg",
    "alt": "Safari scene in Serengeti National Park",
    "width": 496,
    "height": 722,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/tanzania"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-plains-1",
    "src": "/images/tours/mara-plains-1.jpg",
    "alt": "Safari scene in the Maasai Mara Game Reserve",
    "width": 960,
    "height": 1280,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-plains-2",
    "src": "/images/tours/mara-plains-2.jpg",
    "alt": "Safari scene in the Maasai Mara Game Reserve",
    "width": 736,
    "height": 1104,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-plains-3",
    "src": "/images/tours/mara-plains-3.jpg",
    "alt": "Safari scene in the Maasai Mara Game Reserve",
    "width": 736,
    "height": 1104,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "amboseli-scene-1",
    "src": "/images/tours/amboseli-scene-1.jpg",
    "alt": "Safari scene in Amboseli National Park",
    "width": 736,
    "height": 980,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "amboseli-scene-2",
    "src": "/images/tours/amboseli-scene-2.jpg",
    "alt": "Safari scene in Amboseli National Park",
    "width": 736,
    "height": 920,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "tours/category/kenya",
      "tours/category/nairobi-day"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "amboseli-elephants-egrets",
    "src": "/images/destinations/amboseli-elephants-egrets.jpg",
    "alt": "Elephants with egrets in Amboseli National Park, safari vehicles behind",
    "width": 1136,
    "height": 1420,
    "focal": "50% 45%",
    "orientation": "portrait",
    "slots": [
      "destinations/amboseli"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "manyara-flamingo-lake",
    "src": "/images/destinations/manyara-flamingo-lake.jpg",
    "alt": "Buffalo and gazelles before the flamingo covered lake in Lake Manyara",
    "width": 1080,
    "height": 1350,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "destinations/lake-manyara"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "nakuru-buffalo-flamingos",
    "src": "/images/destinations/nakuru-buffalo-flamingos.jpg",
    "alt": "Buffalo resting in shallow water with flamingos behind in Lake Nakuru National Park",
    "width": 768,
    "height": 768,
    "focal": "50% 45%",
    "orientation": "square",
    "slots": [
      "destinations/lake-nakuru"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "nakuru-wildlife-2",
    "src": "/images/destinations/nakuru-wildlife-2.jpg",
    "alt": "Wildlife at Lake Nakuru National Park",
    "width": 736,
    "height": 643,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "destinations/lake-nakuru"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "nakuru-wildlife-3",
    "src": "/images/destinations/nakuru-wildlife-3.jpg",
    "alt": "Wildlife at Lake Nakuru National Park",
    "width": 736,
    "height": 736,
    "focal": "50% 40%",
    "orientation": "square",
    "slots": [
      "destinations/lake-nakuru"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "nakuru-wildlife-4",
    "src": "/images/destinations/nakuru-wildlife-4.jpg",
    "alt": "Wildlife at Lake Nakuru National Park",
    "width": 640,
    "height": 480,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "destinations/lake-nakuru"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "ngorongoro-crater-aerial",
    "src": "/images/destinations/ngorongoro-crater-aerial.jpg",
    "alt": "Ngorongoro Crater lake from above with elephants at dawn",
    "width": 736,
    "height": 1104,
    "focal": "50% 45%",
    "orientation": "portrait",
    "slots": [
      "destinations/ngorongoro"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "tarangire-river-elephants",
    "src": "/images/destinations/tarangire-river-elephants.jpg",
    "alt": "Elephants in a wide riverbed in Tarangire National Park, seen from above",
    "width": 736,
    "height": 736,
    "focal": "50% 40%",
    "orientation": "square",
    "slots": [
      "destinations/tarangire"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "aberdare-moorland-hikers",
    "src": "/images/destinations/aberdare-moorland-hikers.jpg",
    "alt": "Hikers walking moorland between rock towers in Aberdare National Park",
    "width": 1200,
    "height": 900,
    "focal": "50% 55%",
    "orientation": "landscape",
    "slots": [
      "destinations/aberdares"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "aberdare-highlands-1",
    "src": "/images/destinations/aberdare-highlands-1.jpg",
    "alt": "Highland scenery in Aberdare National Park",
    "width": 1080,
    "height": 674,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "destinations/aberdares"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "aberdare-highlands-2",
    "src": "/images/destinations/aberdare-highlands-2.jpg",
    "alt": "Highland scenery in Aberdare National Park",
    "width": 500,
    "height": 350,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "destinations/aberdares"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "aberdare-highlands-3",
    "src": "/images/destinations/aberdare-highlands-3.jpg",
    "alt": "Highland scenery in Aberdare National Park",
    "width": 737,
    "height": 416,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "destinations/aberdares"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "giraffe-centre-sign",
    "src": "/images/experiences/giraffe-centre-sign.jpg",
    "alt": "Giraffe Centre entrance sign in Nairobi, Kenya",
    "width": 736,
    "height": 981,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "experiences/giraffe-centre"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "giraffe-feeding-platform",
    "src": "/images/experiences/giraffe-feeding-platform.jpg",
    "alt": "Giraffes at the feeding platform at the Giraffe Centre, Nairobi",
    "width": 736,
    "height": 736,
    "focal": "50% 40%",
    "orientation": "square",
    "slots": [
      "experiences/giraffe-centre"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "giraffe-hand-feeding",
    "src": "/images/experiences/giraffe-hand-feeding.jpg",
    "alt": "Giraffe taking food from a visitor's hand at the Giraffe Centre, Nairobi",
    "width": 736,
    "height": 992,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "experiences/giraffe-centre"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "sheldrick-bottle-feeding",
    "src": "/images/experiences/sheldrick-bottle-feeding.jpg",
    "alt": "Keeper bottle feeding a young elephant at the Sheldrick Elephant Orphanage, Nairobi",
    "width": 1200,
    "height": 1800,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "experiences/sheldrick-elephant-orphanage"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "sheldrick-calf-line",
    "src": "/images/experiences/sheldrick-calf-line.jpg",
    "alt": "Keeper walking with young orphan elephants at the Sheldrick Elephant Orphanage, Nairobi",
    "width": 1080,
    "height": 1080,
    "focal": "50% 40%",
    "orientation": "square",
    "slots": [
      "experiences/sheldrick-elephant-orphanage"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "sheldrick-calf-bottle",
    "src": "/images/experiences/sheldrick-calf-bottle.jpg",
    "alt": "Young elephant drinking from a milk bottle at the Sheldrick Elephant Orphanage, Nairobi",
    "width": 670,
    "height": 447,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "experiences/sheldrick-elephant-orphanage"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "sheldrick-calf-visitors",
    "src": "/images/experiences/sheldrick-calf-visitors.jpg",
    "alt": "Young elephant with visitors at the Sheldrick Elephant Orphanage, Nairobi",
    "width": 1168,
    "height": 1557,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "experiences/sheldrick-elephant-orphanage"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "nairobi-museum-entrance",
    "src": "/images/experiences/nairobi-museum-entrance.jpg",
    "alt": "Nairobi National Museum entrance with a metal sculpture",
    "width": 1200,
    "height": 900,
    "focal": "50% 45%",
    "orientation": "landscape",
    "slots": [
      "experiences/nairobi-national-museum",
      "destinations/nairobi"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "nairobi-museum-culture",
    "src": "/images/experiences/nairobi-museum-culture.jpg",
    "alt": "Visitor viewing a cultural wildlife display inside the Nairobi National Museum",
    "width": 736,
    "height": 981,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "experiences/nairobi-national-museum"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bomas-dancers",
    "src": "/images/experiences/bomas-dancers.jpg",
    "alt": "Dancers leaping on stage with baskets and drums at Bomas of Kenya",
    "width": 1024,
    "height": 621,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "experiences/bomas-of-kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bomas-dancers-costume",
    "src": "/images/experiences/bomas-dancers-costume.jpg",
    "alt": "Dancers in costume performing on stage at Bomas of Kenya",
    "width": 1199,
    "height": 796,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "experiences/bomas-of-kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bomas-auditorium",
    "src": "/images/experiences/bomas-auditorium.jpg",
    "alt": "Auditorium with a red stage floor at Bomas of Kenya",
    "width": 738,
    "height": 408,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "experiences/bomas-of-kenya"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "carnivore-carver",
    "src": "/images/experiences/carnivore-carver.jpg",
    "alt": "Carver holding roasted meat before the menu board at Carnivore Restaurant, Nairobi",
    "width": 1200,
    "height": 814,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "experiences/carnivore-restaurant"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "carnivore-service",
    "src": "/images/experiences/carnivore-service.jpg",
    "alt": "Carver serving roasted meat to a guest at Carnivore Restaurant, Nairobi",
    "width": 550,
    "height": 412,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "experiences/carnivore-restaurant"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-bush-meal",
    "src": "/images/journal/mara-bush-meal.jpg",
    "alt": "Bush meal spread in the Maasai Mara",
    "width": 1200,
    "height": 1500,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bush-picnic",
    "src": "/images/journal/bush-picnic.jpg",
    "alt": "Picnic lunch set before a safari vehicle in a game reserve",
    "width": 1200,
    "height": 1500,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bush-breakfast-table",
    "src": "/images/journal/bush-breakfast-table.jpg",
    "alt": "Bush breakfast table set outdoors beside a safari vehicle",
    "width": 1160,
    "height": 638,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "mara-sundowner",
    "src": "/images/journal/mara-sundowner.jpg",
    "alt": "Sundowner drinks in the Maasai Mara at dusk",
    "width": 900,
    "height": 1200,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "queen-elizabeth-shoreline",
    "src": "/images/journal/queen-elizabeth-shoreline.jpg",
    "alt": "Elephants, hippos and waterbirds sharing a shoreline in Queen Elizabeth National Park",
    "width": 1200,
    "height": 900,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "queen-elizabeth-1",
    "src": "/images/journal/queen-elizabeth-1.jpg",
    "alt": "Wildlife in Queen Elizabeth National Park",
    "width": 715,
    "height": 429,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "queen-elizabeth-2",
    "src": "/images/journal/queen-elizabeth-2.jpg",
    "alt": "Wildlife in Queen Elizabeth National Park",
    "width": 1000,
    "height": 645,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bwindi-trek",
    "src": "/images/journal/bwindi-trek.jpg",
    "alt": "Guided group trekking up green hillsides in Bwindi Impenetrable National Park",
    "width": 1200,
    "height": 804,
    "focal": "50% 45%",
    "orientation": "landscape",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bwindi-forest-1",
    "src": "/images/journal/bwindi-forest-1.jpg",
    "alt": "Gorillas in the forest of Bwindi Impenetrable National Park",
    "width": 1200,
    "height": 1184,
    "focal": "50% 40%",
    "orientation": "landscape",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bwindi-forest-2",
    "src": "/images/journal/bwindi-forest-2.jpg",
    "alt": "Gorilla in the forest of Bwindi Impenetrable National Park",
    "width": 736,
    "height": 943,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  },
  {
    "id": "bwindi-forest-3",
    "src": "/images/journal/bwindi-forest-3.jpg",
    "alt": "Forest hillside in Bwindi Impenetrable National Park",
    "width": 598,
    "height": 749,
    "focal": "50% 40%",
    "orientation": "portrait",
    "slots": [
      "journal.generic"
    ],
    "credit": "African Bison Classic Tours // TODO confirm credit"
  }
];
// GENERATED:END

const byId = new Map(IMAGES.map((image) => [image.id, image]));

export function imageById(id: string): ImageEntry | null {
  return byId.get(id) ?? null;
}

export function imageForSlot(slot: string): ImageEntry | null {
  return IMAGES.find((image) => image.slots.includes(slot)) ?? null;
}

export function imagesForSlot(slot: string): ImageEntry[] {
  return IMAGES.filter((image) => image.slots.includes(slot));
}

const toursByCategory: Record<string, string> = {
  kenya: "tours/category/kenya",
  tanzania: "tours/category/tanzania",
  "kenya-tanzania": "tours/category/kenya-tanzania",
  "nairobi-day": "tours/category/nairobi-day",
};
const destinationsBySlug: Record<string, string> = {
  "masai-mara": "destinations/masai-mara",
  amboseli: "destinations/amboseli",
  "lake-nakuru": "destinations/lake-nakuru",
  aberdares: "destinations/aberdares",
  serengeti: "destinations/serengeti",
  ngorongoro: "destinations/ngorongoro",
  tarangire: "destinations/tarangire",
  "lake-manyara": "destinations/lake-manyara",
  nairobi: "destinations/nairobi",
};
const postsBySlug: Record<string, string> = {};
void postsBySlug;

export function imageForTour(
  slug: string,
  category: string,
): ImageEntry | null {
  const categorySlot = toursByCategory[category];
  return (
    imageForSlot(`tours/${slug}`) ?? (categorySlot ? imageForSlot(categorySlot) : null)
  );
}

export function imageForDestination(slug: string): ImageEntry | null {
  const slot = destinationsBySlug[slug];
  return slot ? imageForSlot(slot) : null;
}

export function imageForPost(slug: string): ImageEntry | null {
  return imageForSlot(`posts/${slug}`);
}

/**
 * Placement record for the 58 attached client photos: processed target,
 * primary slot, honest alt text. Park names below were confirmed from
 * the supplied filenames (Manyara, Ngorongoro, Tarangire, Aberdare,
 * Bwindi, Queen Elizabeth, Bomas, Sheldrick, Carnivore). One file was
 * excluded (museum hall, third-party watermark) and the logo needs a
 * transparent export. No hotlinking, no stock, no remote hosts.
 */
export interface PlannedImage {
  file: string;
  slot: string;
  alt: string;
  note?: string;
}

export const SLOT_PLAN: PlannedImage[] = [
  { file: "hero/balloon-basket-sunrise.jpg", slot: "hero.primary", alt: "Hot air balloon basket carrying guests over wildebeest and zebra herds at sunrise", note: "Still fallback until hero.mp4 is compressed" },
  { file: "hero/balloon-over-herds.jpg", slot: "closing.background", alt: "Hot air balloon drifting over a grazing wildebeest herd in golden grass" },
  { file: "hero/savanna-sunset-encounter.jpg", slot: "statement.break", alt: "Giraffes and zebras gathered beside a safari vehicle at sunset" },
  { file: "hero/migration-river-sunset.jpg", slot: "migration.scene", alt: "Wildebeest crossing a river at sunset, seen from above" },
  { file: "tours/mara-migration-descent.jpg", slot: "tours/category/kenya-tanzania", alt: "Wildebeest descending a dusty bank toward a river in the Maasai Mara" },
  { file: "tours/mara-game-drive-herd.jpg", slot: "tours/category/kenya", alt: "Open safari vehicle parked before a grazing wildebeest herd in the Maasai Mara" },
  { file: "tours/serengeti-river-crossing.jpg", slot: "tours/category/tanzania", alt: "Wildebeest crossing a rocky river in the Serengeti" },
  { file: "tours/serengeti-zebra-river.jpg", slot: "tours/category/tanzania", alt: "Zebra herd wading through a river under acacia trees in the Serengeti", note: "Photographer signature in frame, confirm licence" },
  { file: "tours/mara-lion-vehicle.jpg", slot: "tours/category/kenya", alt: "Male lion standing beside a safari vehicle in the Maasai Mara" },
  { file: "tours/mara-lion-pride.jpg", slot: "tours/category/kenya", alt: "Lion pride resting beside a safari vehicle with guests in the Maasai Mara" },
  { file: "tours/mara-zebras-dusk.jpg", slot: "tours/category/kenya", alt: "Zebras walking past a safari vehicle with guests at dusk in the Maasai Mara" },
  { file: "tours/serengeti-gate.jpg", slot: "tours/category/tanzania", alt: "Safari vehicle passing the Serengeti National Park entrance gate", note: "Third-party wheel covers visible" },
  { file: "tours/serengeti-game-drive.jpg", slot: "tours/category/tanzania", alt: "Game drive in the Serengeti, Tanzania" },
  { file: "tours/serengeti-plains.jpg", slot: "tours/category/tanzania", alt: "Safari scene in Serengeti National Park" },
  { file: "tours/mara-plains-1.jpg", slot: "tours/category/kenya", alt: "Safari scene in the Maasai Mara Game Reserve" },
  { file: "tours/mara-plains-2.jpg", slot: "tours/category/kenya", alt: "Safari scene in the Maasai Mara Game Reserve" },
  { file: "tours/mara-plains-3.jpg", slot: "tours/category/kenya", alt: "Safari scene in the Maasai Mara Game Reserve" },
  { file: "tours/amboseli-scene-1.jpg", slot: "tours/category/kenya", alt: "Safari scene in Amboseli National Park" },
  { file: "tours/amboseli-scene-2.jpg", slot: "tours/category/kenya", alt: "Safari scene in Amboseli National Park" },
  { file: "destinations/amboseli-elephants-egrets.jpg", slot: "destinations/amboseli", alt: "Elephants with egrets in Amboseli National Park, safari vehicles behind" },
  { file: "destinations/manyara-flamingo-lake.jpg", slot: "destinations/lake-manyara", alt: "Buffalo and gazelles before the flamingo covered lake in Lake Manyara" },
  { file: "destinations/nakuru-buffalo-flamingos.jpg", slot: "destinations/lake-nakuru", alt: "Buffalo resting in shallow water with flamingos behind in Lake Nakuru National Park" },
  { file: "destinations/nakuru-wildlife-2.jpg", slot: "destinations/lake-nakuru", alt: "Wildlife at Lake Nakuru National Park" },
  { file: "destinations/nakuru-wildlife-3.jpg", slot: "destinations/lake-nakuru", alt: "Wildlife at Lake Nakuru National Park" },
  { file: "destinations/nakuru-wildlife-4.jpg", slot: "destinations/lake-nakuru", alt: "Wildlife at Lake Nakuru National Park" },
  { file: "destinations/ngorongoro-crater-aerial.jpg", slot: "destinations/ngorongoro", alt: "Ngorongoro Crater lake from above with elephants at dawn" },
  { file: "destinations/tarangire-river-elephants.jpg", slot: "destinations/tarangire", alt: "Elephants in a wide riverbed in Tarangire National Park, seen from above" },
  { file: "destinations/aberdare-moorland-hikers.jpg", slot: "destinations/aberdares", alt: "Hikers walking moorland between rock towers in Aberdare National Park" },
  { file: "destinations/aberdare-highlands-1.jpg", slot: "destinations/aberdares", alt: "Highland scenery in Aberdare National Park" },
  { file: "destinations/aberdare-highlands-2.jpg", slot: "destinations/aberdares", alt: "Highland scenery in Aberdare National Park" },
  { file: "destinations/aberdare-highlands-3.jpg", slot: "destinations/aberdares", alt: "Highland scenery in Aberdare National Park" },
  { file: "experiences/giraffe-centre-sign.jpg", slot: "experiences/giraffe-centre", alt: "Giraffe Centre entrance sign in Nairobi, Kenya" },
  { file: "experiences/giraffe-feeding-platform.jpg", slot: "experiences/giraffe-centre", alt: "Giraffes at the feeding platform at the Giraffe Centre, Nairobi" },
  { file: "experiences/giraffe-hand-feeding.jpg", slot: "experiences/giraffe-centre", alt: "Giraffe taking food from a visitor's hand at the Giraffe Centre, Nairobi" },
  { file: "experiences/sheldrick-bottle-feeding.jpg", slot: "experiences/sheldrick-elephant-orphanage", alt: "Keeper bottle feeding a young elephant at the Sheldrick Elephant Orphanage, Nairobi", note: "Trust logo on coat" },
  { file: "experiences/sheldrick-calf-line.jpg", slot: "experiences/sheldrick-elephant-orphanage", alt: "Keeper walking with young orphan elephants at the Sheldrick Elephant Orphanage, Nairobi" },
  { file: "experiences/sheldrick-calf-bottle.jpg", slot: "experiences/sheldrick-elephant-orphanage", alt: "Young elephant drinking from a milk bottle at the Sheldrick Elephant Orphanage, Nairobi" },
  { file: "experiences/sheldrick-calf-visitors.jpg", slot: "experiences/sheldrick-elephant-orphanage", alt: "Young elephant with visitors at the Sheldrick Elephant Orphanage, Nairobi" },
  { file: "experiences/nairobi-museum-entrance.jpg", slot: "experiences/nairobi-national-museum", alt: "Nairobi National Museum entrance with a metal sculpture" },
  { file: "experiences/nairobi-museum-culture.jpg", slot: "experiences/nairobi-national-museum", alt: "Visitor viewing a cultural wildlife display inside the Nairobi National Museum" },
  { file: "experiences/bomas-dancers.jpg", slot: "experiences/bomas-of-kenya", alt: "Dancers leaping on stage with baskets and drums at Bomas of Kenya" },
  { file: "experiences/bomas-dancers-costume.jpg", slot: "experiences/bomas-of-kenya", alt: "Dancers in costume performing on stage at Bomas of Kenya" },
  { file: "experiences/bomas-auditorium.jpg", slot: "experiences/bomas-of-kenya", alt: "Auditorium with a red stage floor at Bomas of Kenya" },
  { file: "experiences/carnivore-carver.jpg", slot: "experiences/carnivore-restaurant", alt: "Carver holding roasted meat before the menu board at Carnivore Restaurant, Nairobi" },
  { file: "experiences/carnivore-service.jpg", slot: "experiences/carnivore-restaurant", alt: "Carver serving roasted meat to a guest at Carnivore Restaurant, Nairobi" },
  { file: "journal/mara-bush-meal.jpg", slot: "journal.generic", alt: "Bush meal spread in the Maasai Mara" },
  { file: "journal/bush-picnic.jpg", slot: "journal.generic", alt: "Picnic lunch set before a safari vehicle in a game reserve" },
  { file: "journal/bush-breakfast-table.jpg", slot: "journal.generic", alt: "Bush breakfast table set outdoors beside a safari vehicle" },
  { file: "journal/mara-sundowner.jpg", slot: "journal.generic", alt: "Sundowner drinks in the Maasai Mara at dusk" },
  { file: "journal/queen-elizabeth-shoreline.jpg", slot: "journal.generic", alt: "Elephants, hippos and waterbirds sharing a shoreline in Queen Elizabeth National Park", note: "No Uganda product, journal use only" },
  { file: "journal/queen-elizabeth-1.jpg", slot: "journal.generic", alt: "Wildlife in Queen Elizabeth National Park", note: "Journal use only" },
  { file: "journal/queen-elizabeth-2.jpg", slot: "journal.generic", alt: "Wildlife in Queen Elizabeth National Park", note: "Journal use only" },
  { file: "journal/bwindi-trek.jpg", slot: "journal.generic", alt: "Guided group trekking up green hillsides in Bwindi Impenetrable National Park", note: "Journal use only, never imply gorilla trekking tours" },
  { file: "journal/bwindi-forest-1.jpg", slot: "journal.generic", alt: "Gorillas in the forest of Bwindi Impenetrable National Park", note: "Journal use only" },
  { file: "journal/bwindi-forest-2.jpg", slot: "journal.generic", alt: "Gorilla in the forest of Bwindi Impenetrable National Park", note: "Journal use only" },
  { file: "journal/bwindi-forest-3.jpg", slot: "journal.generic", alt: "Forest hillside in Bwindi Impenetrable National Park", note: "Journal use only" },

  // EXCLUDED from public/images (stays in incoming/, never committed):
  // - "Exhibit 1 inside the museum.jpg": third-party "Beads Safaris
  //   Collection" watermark baked in. Needs a clean export.
  // - "African Bison Classic Tours Logo.jfif": checkerboard background
  //   baked into pixels (JFIF has no transparency). Needs a transparent
  //   PNG export. Reference copy at images/brand/logo-reference.jpg.
];

