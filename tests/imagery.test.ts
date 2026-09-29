import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  IMAGES,
  SLOT_PLAN,
  imageById,
  imageForDestination,
  imageForPost,
  imageForSlot,
  imageForTour,
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
    expect(imageForPost("no-such-post")).toBeNull();
  });

  it("falls back to the category image for unmapped tours", () => {
    const kenya = imageForTour("no-such-tour", "kenya");
    expect(kenya).not.toBeNull();
    expect(kenya?.slots).toContain("tours/category/kenya");
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
