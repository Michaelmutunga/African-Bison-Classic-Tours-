import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { ForbiddenError, UnauthorizedError } from "@/lib/permissions";
import {
  ConflictError,
  NotFoundError,
  createAccommodation,
  createActivity,
  createAddOn,
  createCategory,
  createDestination,
  createPriceComponent,
  createSeason,
  createTour,
  deleteTour,
  getDestinationBySlug,
  getTourBySlug,
  listActivities,
  listTours,
  setTourPublished,
  slugify,
  updateDestination,
  updateTour,
} from "@/server/catalogue";
import { testActor, unique } from "@/tests/db";

const admin = testActor("ADMIN");
const editor = testActor("CONTENT_MANAGER");
const consultant = testActor("SAFARI_CONSULTANT");

describe("slugify", () => {
  it("produces clean slugs", () => {
    expect(slugify("  Maasai Mara & Serengeti! ")).toBe("maasai-mara-serengeti");
    expect(slugify("Ngorongoro Crater")).toBe("ngorongoro-crater");
  });
});

describe("categories and destinations", () => {
  it("creates with auto slugs and rejects duplicates", async () => {
    const name = unique("Test Category");
    const created = await createCategory(admin, { name });
    expect(created.slug).toContain("test-category");
    await expect(createCategory(admin, { name, slug: created.slug })).rejects.toThrow(
      ConflictError,
    );
    await prisma.tourCategory.delete({ where: { id: created.id } });
  });

  it("requires authentication and write permission", async () => {
    await expect(createCategory(null, { name: "x" })).rejects.toThrow(UnauthorizedError);
    await expect(createCategory(consultant, { name: "x" })).rejects.toThrow(ForbiddenError);
  });

  it("creates and updates destinations", async () => {
    const slug = unique("test-dest");
    const created = await createDestination(admin, {
      name: "Test Destination",
      slug,
      country: "Kenya",
      excerpt: "A fine place for testing.",
    });
    expect(created.published).toBe(true);
    const updated = await updateDestination(admin, created.id, { country: "Tanzania" });
    expect(updated.country).toBe("Tanzania");
    // Unpublished destinations are hidden from public reads.
    await updateDestination(admin, created.id, { published: false });
    await expect(getDestinationBySlug(slug, true)).rejects.toThrow(NotFoundError);
    expect((await getDestinationBySlug(slug, false)).id).toBe(created.id);
    await prisma.destination.delete({ where: { id: created.id } });
  });
});

describe("tours", () => {
  async function seedCategory() {
    return createCategory(admin, { name: unique("Tour Cat") });
  }

  it("creates a tour with days and auto slug", async () => {
    const category = await seedCategory();
    const title = unique("Amazing Test Safari");
    const tour = await createTour(admin, {
      title,
      categoryId: category.id,
      durationDays: 4,
      excerpt: "A wonderful test journey.",
      overview: ["Day by day wonder."],
      includes: ["Everything"],
      excludes: ["Nothing"],
      days: [
        { dayNumber: 1, title: "Day 1: Arrival", body: "You arrive and rest well." },
        { dayNumber: 2, title: "Day 2: Safari", body: "You see many animals all day." },
      ],
    });
    expect(tour.published).toBe(false);
    expect(tour.days).toHaveLength(2);
    expect(tour.slug.startsWith("amazing-test-safari")).toBe(true);

    // Drafts are invisible to public reads.
    await expect(getTourBySlug(tour.slug, true)).rejects.toThrow(NotFoundError);
    const fetched = await getTourBySlug(tour.slug, false);
    expect(fetched.days.map((d) => d.dayNumber)).toEqual([1, 2]);

    await deleteTour(admin, tour.id);
    await expect(getTourBySlug(tour.slug, false)).rejects.toThrow(NotFoundError);
    // Days cascade with the tour.
    expect(
      await prisma.itineraryDay.count({ where: { tourId: tour.id } }),
    ).toBe(0);
    await prisma.tourCategory.delete({ where: { id: category.id } });
  });

  it("publishes through the publish permission only", async () => {
    const category = await seedCategory();
    const tour = await createTour(admin, {
      title: unique("Publish Test"),
      categoryId: category.id,
      durationDays: 2,
      excerpt: "Publish me if you can.",
    });
    await expect(setTourPublished(consultant, tour.id, true)).rejects.toThrow(ForbiddenError);
    await expect(setTourPublished(null, tour.id, true)).rejects.toThrow(UnauthorizedError);
    await setTourPublished(editor, tour.id, true);
    expect((await getTourBySlug(tour.slug, true)).published).toBe(true);
    await setTourPublished(editor, tour.id, false);
    await expect(getTourBySlug(tour.slug, true)).rejects.toThrow(NotFoundError);
    await deleteTour(admin, tour.id);
    await prisma.tourCategory.delete({ where: { id: category.id } });
  });

  it("rejects duplicate slugs and duplicate day numbers", async () => {
    const category = await seedCategory();
    const slug = unique("dup-tour");
    const first = await createTour(admin, {
      title: "First",
      slug,
      categoryId: category.id,
      durationDays: 2,
      excerpt: "First tour here.",
    });
    await expect(
      createTour(admin, {
        title: "Second",
        slug,
        categoryId: category.id,
        durationDays: 2,
        excerpt: "Second tour here.",
      }),
    ).rejects.toThrow(ConflictError);
    await expect(
      createTour(admin, {
        title: unique("Bad Days"),
        categoryId: category.id,
        durationDays: 2,
        excerpt: "Bad days here.",
        days: [
          { dayNumber: 1, title: "Day 1: A", body: "Body one two three." },
          { dayNumber: 1, title: "Day 1: B", body: "Body four five six." },
        ],
      }),
    ).rejects.toThrow(ConflictError);
    await deleteTour(admin, first.id);
    await prisma.tourCategory.delete({ where: { id: category.id } });
  });

  it("updates replace days transactionally", async () => {
    const category = await seedCategory();
    const tour = await createTour(admin, {
      title: unique("Update Days"),
      categoryId: category.id,
      durationDays: 3,
      excerpt: "Update my days.",
      days: [{ dayNumber: 1, title: "Day 1: Old", body: "Old body text here." }],
    });
    const updated = await updateTour(admin, tour.id, {
      title: `${tour.title} Revised`,
      days: [
        { dayNumber: 2, title: "Day 2: New", body: "New body text here." },
        { dayNumber: 3, title: "Day 3: Newer", body: "Newer body text here." },
      ],
    });
    expect(updated.days.map((d) => d.dayNumber)).toEqual([2, 3]);
    await expect(updateTour(admin, "ck00000000000000000000000", { title: "x".repeat(10) })).rejects.toThrow(
      NotFoundError,
    );
    await deleteTour(admin, tour.id);
    await prisma.tourCategory.delete({ where: { id: category.id } });
  });

  it("lists with category and publish filters", async () => {
    const category = await seedCategory();
    const slug = unique("filter-tour");
    const tour = await createTour(admin, {
      title: "Filter Me",
      slug,
      categoryId: category.id,
      durationDays: 2,
      excerpt: "Filter me please.",
    });
    expect(await listTours({ publishedOnly: true })).not.toContainEqual(
      expect.objectContaining({ id: tour.id }),
    );
    const all = await listTours({ publishedOnly: false, categoryId: category.id });
    expect(all.map((t) => t.id)).toContain(tour.id);
    const searched = await listTours({ publishedOnly: false, search: "filter me" });
    expect(searched.map((t) => t.id)).toContain(tour.id);
    await deleteTour(admin, tour.id);
    await prisma.tourCategory.delete({ where: { id: category.id } });
  });
});

describe("activities, accommodation, add-ons, seasons, price components", () => {
  it("creates each catalogue entity", async () => {
    const activity = await createActivity(admin, {
      name: unique("Balloon Flight"),
      priceCents: 59000,
      currency: "USD",
    });
    expect(activity.priceCents).toBe(59000);
    expect(await listActivities(true)).toContainEqual(expect.objectContaining({ id: activity.id }));

    const stay = await createAccommodation(admin, {
      name: unique("Test Camp"),
      location: "Maasai Mara",
      roomTypes: [{ name: "Double tent", capacity: 2 }],
    });
    expect(stay.slug).toContain("test-camp");

    const addOn = await createAddOn(admin, { name: unique("Village Visit") });
    expect(addOn.published).toBe(true);

    const season = await createSeason(admin, { name: unique("Test Season") });
    expect(season.slug).toContain("test-season");

    const component = await createPriceComponent(admin, {
      name: unique("Park Fee"),
      kind: "park_fee",
      amountCents: 8000,
      perPerson: true,
    });
    expect(component.amountCents).toBe(8000);

    await expect(
      createActivity(consultant, { name: unique("Nope") }),
    ).rejects.toThrow(ForbiddenError);

    await prisma.activity.delete({ where: { id: activity.id } });
    await prisma.accommodation.delete({ where: { id: stay.id } });
    await prisma.tourAddOn.delete({ where: { id: addOn.id } });
    await prisma.season.delete({ where: { id: season.id } });
    await prisma.priceComponent.delete({ where: { id: component.id } });
  });
});
