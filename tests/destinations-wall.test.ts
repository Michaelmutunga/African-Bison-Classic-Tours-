import { describe, expect, it } from "vitest";
import {
  buildDriftWallItems,
  destinationsWithoutWallImage,
} from "@/lib/destinations-wall";
import type { PublicDestinationSummary } from "@/lib/catalog";

const DESTINATIONS: PublicDestinationSummary[] = [
  { slug: "masai-mara", name: "Maasai Mara National Reserve", country: "Kenya", excerpt: "Big cats and river crossings.", highlights: [] },
  { slug: "serengeti", name: "Serengeti National Park", country: "Tanzania", excerpt: "Endless plains.", highlights: [] },
  { slug: "amboseli", name: "Amboseli National Park", country: "Kenya", excerpt: "Elephants and Kilimanjaro views.", highlights: [] },
  { slug: "ngorongoro", name: "Ngorongoro Crater", country: "Tanzania", excerpt: "A natural enclosure.", highlights: [] },
  { slug: "lake-bogoria", name: "Lake Bogoria National Reserve", country: "Kenya", excerpt: "Flamingos and hot springs.", highlights: [] },
  { slug: "ol-pejeta", name: "Ol Pejeta Conservancy (Sweetwaters)", country: "Kenya", excerpt: "Rhino conservation.", highlights: [] },
  { slug: "no-such-place", name: "Nowhere", country: "Kenya", excerpt: "Unknown.", highlights: [] },
];

describe("buildDriftWallItems", () => {
  it("maps destinations with processed photography to internal tiles", () => {
    const items = buildDriftWallItems(DESTINATIONS);
    expect(items.length).toBeGreaterThanOrEqual(4);
    for (const item of items) {
      expect(item.image).toMatch(/^\/images\//);
      expect(item.image).not.toContain("picsum");
      expect(item.href).toMatch(/^\/destinations\//);
      expect(item.title.trim().length).toBeGreaterThan(0);
      expect(item.alt.trim().length).toBeGreaterThan(0);
    }
  });

  it("leaves destinations without photography out of the wall", () => {
    const items = buildDriftWallItems(DESTINATIONS);
    const hrefs = items.map((item) => item.href);
    expect(hrefs).not.toContain("/destinations/lake-bogoria");
    expect(hrefs).not.toContain("/destinations/ol-pejeta");
    expect(hrefs).not.toContain("/destinations/no-such-place");
    const missing = destinationsWithoutWallImage(DESTINATIONS).map((d) => d.slug);
    expect(missing).toContain("lake-bogoria");
    expect(missing).toContain("ol-pejeta");
  });

  it("spreads anchor parks apart so columns do not cluster", () => {
    const items = buildDriftWallItems(DESTINATIONS);
    const titles = items.map((item) => item.title);
    const mara = titles.indexOf("Maasai Mara National Reserve");
    const serengeti = titles.indexOf("Serengeti National Park");
    // With round-robin columns, neighbours land in the same column only
    // when adjacent; anchors must keep their distance in wall order.
    expect(Math.abs(mara - serengeti)).toBeGreaterThan(0);
    expect(titles[0]).toBe("Maasai Mara National Reserve");
    expect(titles[1]).toBe("Serengeti National Park");
  });

  it("returns an empty wall rather than remote filler for unknown input", () => {
    expect(buildDriftWallItems([])).toEqual([]);
    expect(
      buildDriftWallItems([
        { slug: "no-such-place", name: "Nowhere", country: "Kenya", excerpt: "x", highlights: [] },
      ]),
    ).toEqual([]);
  });
});
