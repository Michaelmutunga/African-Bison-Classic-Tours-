import { describe, expect, it } from "vitest";
import {
  deriveCategories,
  summarizeTours,
  toursForDestinationName,
  type PublishedTourRow,
} from "@/lib/catalog";

function row(
  overrides: Partial<PublishedTourRow> & { slug: string; title: string },
): PublishedTourRow {
  return {
    id: `id-${overrides.slug}`,
    categoryId: "cat-1",
    destinationIds: [],
    durationDays: 3,
    excerpt: "Excerpt",
    overview: [],
    includes: [],
    excludes: [],
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    seoTitle: null,
    seoDescription: null,
    category: { id: "cat-1", slug: "kenya", name: "Kenya", createdAt: new Date() },
    destinations: [],
    ...overrides,
  } as PublishedTourRow;
}

/**
 * The homepage/tours pages must derive every section from ONE tour-table
 * scan. These pure helpers are the mechanism — a regression here means a
 * return to per-section full queries (the original ~1.6s homepage).
 */
describe("catalogue single-fetch derivations", () => {
  const tours = [
    row({ slug: "mara-3", title: "3 Days Masai Mara Safari", durationDays: 3 }),
    row({
      slug: "amboseli-2",
      title: "2 Days Amboseli Safari",
      durationDays: 2,
      category: { id: "cat-1", slug: "kenya", name: "Kenya", createdAt: new Date() },
    }),
    row({
      slug: "serengeti-3",
      title: "3 Days Serengeti Safari",
      durationDays: 3,
      category: { id: "cat-2", slug: "tanzania", name: "Tanzania", createdAt: new Date() },
    }),
  ];

  it("derives categories with counts", () => {
    expect(deriveCategories(tours)).toEqual([
      { slug: "kenya", label: "Kenya", count: 2 },
      { slug: "tanzania", label: "Tanzania", count: 1 },
    ]);
  });

  it("summarizes all tours sorted, or filtered by category", () => {
    expect(summarizeTours(tours).map((t) => t.slug)).toEqual([
      "amboseli-2",
      "mara-3",
      "serengeti-3",
    ]);
    expect(summarizeTours(tours, "tanzania").map((t) => t.slug)).toEqual(["serengeti-3"]);
    expect(summarizeTours(tours, "unknown")).toEqual([]);
  });

  it("matches destination related tours including Maasai/Masai spelling", () => {
    expect(toursForDestinationName(tours, "Maasai Mara").map((t) => t.slug)).toEqual(["mara-3"]);
    expect(toursForDestinationName(tours, "Amboseli").map((t) => t.slug)).toEqual(["amboseli-2"]);
    expect(toursForDestinationName(tours, "Nairobi")).toEqual([]);
  });
});
