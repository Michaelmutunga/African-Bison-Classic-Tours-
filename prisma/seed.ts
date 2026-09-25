import { PrismaClient } from "@prisma/client";
import aboutJson from "../data/content/about.json" with { type: "json" };
import destinationsJson from "../data/content/destinations.json" with { type: "json" };
import postsJson from "../data/content/posts.json" with { type: "json" };
import toursJson from "../data/content/tours.json" with { type: "json" };

const prisma = new PrismaClient();

type TourSeed = {
  slug: string;
  title: string;
  category: string;
  durationDays: number;
  excerpt: string;
  overview: string[];
  itinerary: { n: number; title: string; body: string }[];
  includes: string[];
  excludes: string[];
  sourceUrl: string;
  sourceUpdated: string | null;
};

type DestinationSeed = {
  slug: string;
  name: string;
  country: string;
  excerpt: string;
  highlights: string[];
};

const CATEGORY_NAMES: Record<string, string> = {
  kenya: "Kenya safaris",
  tanzania: "Tanzania safaris",
  "kenya-tanzania": "Kenya + Tanzania",
  "nairobi-day": "Nairobi day experiences",
};

function destinationTokens(name: string): string[] {
  const token =
    name
      .replace(/^(Mount|Lake)\s+/i, "")
      .split(/[\s-]+/)[0]
      ?.toLowerCase() ?? "";
  if (!token || token.length < 4) return [];
  return token === "maasai" ? ["maasai", "masai"] : [token];
}

async function seedSettings() {
  const settings: Array<[string, string]> = [
    ["business.name", "African Bison Classic Tours"],
    ["business.city", "Nairobi, Kenya"],
    ["business.address", "JKIA Airport, 1st Floor, Suite 1"],
    // Mirrored from the live site at migration review; configurable, not constants.
    ["business.phonePrimary", "+254734466432"],
    ["business.phoneSecondary", "+254111234567"],
    ["business.email", "info@africanbisonclassictours.com"],
  ];
  for (const [key, value] of settings) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}

async function seedCatalogue() {
  const tours = (toursJson as { tours: TourSeed[] }).tours;
  const destinations = (destinationsJson as { destinations: DestinationSeed[] }).destinations;

  const categoryIds = new Map<string, string>();
  for (const [slug, name] of Object.entries(CATEGORY_NAMES)) {
    const category = await prisma.tourCategory.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    });
    categoryIds.set(slug, category.id);
  }

  const destinationIds = new Map<string, string>();
  for (const dest of destinations) {
    const record = await prisma.destination.upsert({
      where: { slug: dest.slug },
      update: {
        name: dest.name,
        country: dest.country,
        excerpt: dest.excerpt,
        highlights: dest.highlights,
        published: true,
      },
      create: {
        slug: dest.slug,
        name: dest.name,
        country: dest.country,
        excerpt: dest.excerpt,
        highlights: dest.highlights,
        published: true,
      },
    });
    destinationIds.set(dest.slug, record.id);
  }

  let tourCount = 0;
  let dayCount = 0;
  for (const tour of tours) {
    const categoryId = categoryIds.get(tour.category);
    if (!categoryId) {
      console.warn(`unknown category ${tour.category} for ${tour.slug}; skipping`);
      continue;
    }
    const linkedDestinationIds = [...destinationIds.entries()]
      .filter(([slug]) => {
        const dest = destinations.find((d) => d.slug === slug);
        if (!dest) return false;
        const tokens = destinationTokens(dest.name);
        const title = tour.title.toLowerCase();
        return tokens.some((token) => title.includes(token));
      })
      .map(([, id]) => ({ id }));

    const record = await prisma.tourProduct.upsert({
      where: { slug: tour.slug },
      update: {
        title: tour.title,
        categoryId,
        destinations: { set: linkedDestinationIds },
        durationDays: tour.durationDays,
        excerpt: tour.excerpt.slice(0, 500),
        overview: tour.overview.slice(0, 10),
        includes: tour.includes.slice(0, 30),
        excludes: tour.excludes.slice(0, 30),
        published: true,
        sourceUrl: tour.sourceUrl,
        sourceUpdated: tour.sourceUpdated ? new Date(tour.sourceUpdated) : null,
      },
      create: {
        slug: tour.slug,
        title: tour.title,
        categoryId,
        destinations: { connect: linkedDestinationIds },
        durationDays: tour.durationDays,
        excerpt: tour.excerpt.slice(0, 500),
        overview: tour.overview.slice(0, 10),
        includes: tour.includes.slice(0, 30),
        excludes: tour.excludes.slice(0, 30),
        published: true,
        sourceUrl: tour.sourceUrl,
        sourceUpdated: tour.sourceUpdated ? new Date(tour.sourceUpdated) : null,
      },
    });
    // Re-seeding resets migrated itinerary days to the source snapshot.
    // Tours or days created by staff are preserved only if their slugs are
    // absent from the migration source.
    await prisma.itineraryDay.deleteMany({ where: { tourId: record.id } });
    // Some source pages repeat a day number; keep the first occurrence so the
    // (tourId, dayNumber) constraint holds while staying source-faithful.
    const seen = new Set<number>();
    const days = tour.itinerary.filter((day) => {
      if (seen.has(day.n)) return false;
      seen.add(day.n);
      return true;
    });
    if (days.length > 0) {
      await prisma.itineraryDay.createMany({
        data: days.map((day) => ({
          tourId: record.id,
          dayNumber: day.n,
          title: day.title.slice(0, 200),
          body: day.body,
        })),
      });
      dayCount += days.length;
    }
    tourCount += 1;
  }

  const addOns = [
    { slug: "hot-air-balloon-safari", name: "Hot air balloon safari", description: "Sunrise balloon flight over the Mara or Serengeti with bush breakfast. Priced on request." },
    { slug: "maasai-village-visit", name: "Maasai village visit", description: "Guided cultural visit with a local community. Priced on request." },
    { slug: "lake-naivasha-boat-ride", name: "Lake Naivasha boat ride", description: "Boat excursion among hippos with fish-eagle feeding. Priced on request." },
    { slug: "safari-photography-guide", name: "Photography guide", description: "Professional photographer guide for private safaris. Priced on request." },
  ];
  for (const addOn of addOns) {
    await prisma.tourAddOn.upsert({
      where: { slug: addOn.slug },
      update: { name: addOn.name, description: addOn.description, published: true },
      create: { ...addOn, published: true },
    });
  }

  const seasons = [
    { slug: "migration-season", name: "Migration season", startsOn: "07-01", endsOn: "10-31", notes: "Mara River crossings typically July to October. Wildlife moves on its own schedule." },
    { slug: "calving-season", name: "Calving season", startsOn: "01-01", endsOn: "03-31", notes: "Wildebeest calving in the southern Serengeti; big-cat action." },
    { slug: "green-season", name: "Green season", startsOn: "03-01", endsOn: "05-31", notes: "Long rains bring lush landscapes, fewer vehicles and lower rates." },
  ];
  for (const season of seasons) {
    await prisma.season.upsert({
      where: { slug: season.slug },
      update: season,
      create: season,
    });
  }

  console.log(
    `Catalogue seeded: ${categoryIds.size} categories, ${destinationIds.size} destinations, ${tourCount} tours, ${dayCount} days, ${addOns.length} add-ons, ${seasons.length} seasons.`,
  );
  void aboutJson;
  void postsJson;
}

async function main() {
  await seedSettings();
  await seedCatalogue();
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
