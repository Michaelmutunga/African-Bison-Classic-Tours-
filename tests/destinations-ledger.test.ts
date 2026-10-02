import { describe, expect, it } from "vitest";
import { countToursForDestinationName } from "@/lib/catalog";
import type {
  PublicDestinationSummary,
  PublishedTourRow,
} from "@/lib/catalog";
import { buildDestinationSafariCounts } from "@/lib/destinations-wall";

function tourRow(title: string, slug: string): PublishedTourRow {
  return {
    id: `id-${slug}`,
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
    sourceUrl: null,
    sourceUpdated: null,
    category: { id: "cat-1", slug: "kenya", name: "Kenya", createdAt: new Date() },
    destinations: [],
    slug,
    title,
  } as PublishedTourRow;
}

function destination(
  slug: string,
  name: string,
  country = "Kenya",
): PublicDestinationSummary {
  return { slug, name, country, excerpt: "Excerpt", highlights: [] };
}

describe("countToursForDestinationName", () => {
  it("counts tours across Maasai/Masai spellings", () => {
    const tours = [
      tourRow("3 Days Masai Mara Safari", "mara-3"),
      tourRow("4 Days Great Maasai Mara Migration and Balloon Safari", "mara-4"),
      tourRow("2 Days Amboseli Safari", "amboseli-2"),
    ];
    expect(countToursForDestinationName(tours, "Maasai Mara National Reserve")).toBe(2);
    expect(countToursForDestinationName(tours, "Amboseli National Park")).toBe(1);
  });

  it("counts every match instead of capping at six", () => {
    const tours = Array.from({ length: 8 }, (_, i) =>
      tourRow(`Amboseli Safari ${i + 1}`, `amboseli-${i + 1}`),
    );
    expect(countToursForDestinationName(tours, "Amboseli National Park")).toBe(8);
  });

  it("strips Lake/Mount prefixes and ignores short tokens", () => {
    const tours = [tourRow("2 Days Lake Nakuru Safari", "nakuru-2")];
    expect(countToursForDestinationName(tours, "Lake Nakuru National Park")).toBe(1);
    expect(countToursForDestinationName(tours, "Nairobi")).toBe(0);
    expect(countToursForDestinationName(tours, "Li")).toBe(0);
  });
});

describe("buildDestinationSafariCounts", () => {
  it("maps every destination slug to its count", () => {
    const tours = [
      tourRow("3 Days Masai Mara Safari", "mara-3"),
      tourRow("2 Days Amboseli Safari", "amboseli-2"),
    ];
    const counts = buildDestinationSafariCounts(tours, [
      destination("masai-mara", "Maasai Mara National Reserve"),
      destination("amboseli", "Amboseli National Park"),
      destination("samburu", "Samburu National Reserve"),
    ]);
    expect(counts).toEqual({ "masai-mara": 1, amboseli: 1, samburu: 0 });
  });

  it("returns an empty map for an empty catalogue", () => {
    expect(buildDestinationSafariCounts([], [])).toEqual({});
  });
});
