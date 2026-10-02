import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  IMAGES,
  SLOT_PLAN,
  imageById,
  imageForActivity,
  imageForBuilderOption,
  imageForDestination,
  imageForItineraryDay,
  imageForPost,
  imageForSlot,
  imageForTour,
  imageForTourUnique,
  imagesForSlot,
} from "@/lib/imagery";

const ROOT = process.cwd();

describe("imagery manifest", () => {
  it("registers unique ids with alt text and dimensions", () => {
    const ids = IMAGES.map((image) => image.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const image of IMAGES) {
      expect(image.alt.trim().length).toBeGreaterThan(0);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.credit.trim().length).toBeGreaterThan(0);
    }
  });

  it("points every src at a file on disk", () => {
    for (const image of IMAGES) {
      const relative = image.src.replace(/^\//, "");
      expect(existsSync(join(ROOT, "public", relative)), image.src).toBe(true);
    }
  });

  it("keeps helpers null-safe for unknown slugs and slots", () => {
    expect(imageById("no-such-image")).toBeNull();
    expect(imageForSlot("no-such-slot")).toBeNull();
    expect(imageForTour("no-such-tour", "no-such-category")).toBeNull();
    expect(imageForDestination("no-such-place")).toBeNull();
    expect(imageForBuilderOption("region", "no-such-region")).toBeNull();
    expect(imageForActivity("")).toBeNull();
  });

  it("gives blog posts a deterministic generic image instead of a placeholder", () => {
    const post = imageForPost("no-such-post");
    expect(post).not.toBeNull();
    expect(post?.slots).toContain("journal.generic");
    expect(imageForPost("another-post")?.id).toBe(imageForPost("another-post")?.id);
  });

  it("maps builder options to on-disk client photos", () => {
    const picks = [
      imageForBuilderOption("region", "kenya"),
      imageForBuilderOption("region", "uganda"),
      imageForBuilderOption("experience", "migration"),
      imageForBuilderOption("comfort", "luxury"),
      imageForBuilderOption("transport", "land-cruiser"),
      imageForBuilderOption("addon", "hot-air-balloon-safari"),
    ];
    for (const pick of picks) expect(pick).not.toBeNull();
    // Uganda uses the forest hillside, never a gorilla close-up.
    expect(imageForBuilderOption("region", "uganda")?.id).toBe("bwindi-forest-3");
  });

  it("resolves itinerary days to activity photos before destination photos", () => {
    const balloon = imageForItineraryDay("masai-mara", ["Hot air balloon safari"], ["Game drives"]);
    expect(balloon?.id).toBe("balloon-basket-sunrise");
    const mara = imageForItineraryDay("masai-mara", [], ["Game drives and activities in Maasai Mara"]);
    expect(mara?.id).toBe("mara-zebras-dusk");
  });

  it("falls back to the category image for unmapped tours", () => {
    const kenya = imageForTour("no-such-tour", "kenya");
    expect(kenya).not.toBeNull();
    expect(kenya?.slots).toContain("tours/category/kenya");
  });

  it("uses the landing composite as the hero still with a mobile crop", () => {
    expect(imageForSlot("hero.primary")?.id).toBe("landing-savannah-sunset");
    expect(imageForSlot("hero.primary-mobile")?.id).toBe(
      "landing-savannah-sunset-mobile",
    );
  });

  it("spreads tours across the category pool instead of repeating one image", () => {
    const pool = imagesForSlot("tours/category/kenya").map((image) => image.id);
    expect(pool.length).toBeGreaterThan(3);
    const slugs = [
      "2-days-amboseli-national-park-safari",
      "3-days-masai-mara-game-reserve-safari",
      "4-days-great-masai-mara-migration-and-balloon-safari",
      "5-days-amboseli-lake-naivasha-masai-mara-safari",
      "6-days-amboseli-aberdares-lake-nakuru-masai-mara-safari",
      "7-days-best-of-kenya-safari-tour",
      "10-days-kenya-wildlife-adventure-safari",
      "2-days-aberdare-national-park-safari",
      "2-days-lake-nakuru-national-park-safari",
      "3-days-amboseli-national-park-safari",
    ];
    const picks = slugs.map((slug) => imageForTour(slug, "kenya")?.id);
    for (const pick of picks) expect(pool).toContain(pick);
    // Every journey in a listing gets its own image.
    expect(new Set(picks).size).toBeGreaterThan(1);
  });

  it("hands every journey its own image across a whole listing", () => {
    const used = new Set<string>();
    const listing: Array<[string, string]> = [
      ["2-days-amboseli-national-park-safari", "kenya"],
      ["3-days-masai-mara-game-reserve-safari", "kenya"],
      ["7-days-best-of-kenya-safari-tour", "kenya"],
      ["3-days-serengeti-national-park-safari", "tanzania"],
      ["6-days-best-of-tanzania-adventure-safari", "tanzania"],
      ["7-days-lake-manyara-serengeti-ngorongoro-tarangire-safari", "tanzania"],
      ["7-days-lake-nakuru-masai-mara-serengeti-ngorongoro-crater-safari", "kenya-tanzania"],
      ["10-days-kenya-tanzania-amazing-wildlife-safari", "kenya-tanzania"],
      ["12-days-kenya-tanzania-wildlife-safari", "kenya-tanzania"],
    ];
    const picks = listing.map(([slug, category]) => imageForTourUnique(slug, category, used));
    for (const pick of picks) expect(pick).not.toBeNull();
    expect(new Set(picks.map((pick) => pick?.id)).size).toBe(listing.length);
  });

  it("plans one file per attached photo with honest alt text", () => {
    const files = SLOT_PLAN.map((row) => row.file);
    expect(new Set(files).size).toBe(files.length);
    for (const row of SLOT_PLAN) {
      expect(row.alt.trim().length).toBeGreaterThan(0);
      expect(row.file).toMatch(/^hero\/|destinations\/|tours\/|experiences\/|journal\/|texture\//);
    }
  });
});
