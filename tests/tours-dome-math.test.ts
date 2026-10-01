import { describe, expect, it } from "vitest";
import {
  buildDomeTiles,
  clampDome,
  domeTileBaseRotation,
  isDomeTileFocusable,
  normalizeDomeAngle,
  wrapDomeAngleSigned,
  type DomePoolEntry,
} from "@/components/tours/dome-math";

function entry(slug: string): DomePoolEntry {
  return {
    src: `/images/${slug}.jpg`,
    alt: slug,
    slug,
    title: `Tour ${slug}`,
    days: 3,
    categoryLabel: "Kenya",
  };
}

describe("buildDomeTiles", () => {
  it("lays five rows per column", () => {
    const tiles = buildDomeTiles([entry("a"), entry("b")], 7);
    expect(tiles).toHaveLength(35);
  });

  it("cycles a small pool across every slot", () => {
    const tiles = buildDomeTiles([entry("a"), entry("b"), entry("c")], 5);
    expect(tiles).toHaveLength(25);
    const slugs = new Set(tiles.map((tile) => tile.slug));
    expect(slugs).toEqual(new Set(["a", "b", "c"]));
  });

  it("keeps neighbours from sharing a photograph", () => {
    const tiles = buildDomeTiles([entry("a"), entry("b")], 9);
    for (let i = 1; i < tiles.length; i++) {
      expect(tiles[i].src).not.toBe(tiles[i - 1].src);
    }
  });

  it("carries tour metadata onto every tile", () => {
    const tiles = buildDomeTiles([entry("mara")], 3);
    expect(tiles[0]).toMatchObject({ slug: "mara", title: "Tour mara", days: 3 });
  });

  it("renders empty tiles when there is no photography", () => {
    const tiles = buildDomeTiles([], 3);
    expect(tiles).toHaveLength(15);
    expect(tiles[0].src).toBe("");
  });
});

describe("dome angles", () => {
  it("normalises and wraps rotations", () => {
    expect(normalizeDomeAngle(-30)).toBe(330);
    expect(normalizeDomeAngle(390)).toBe(30);
    expect(wrapDomeAngleSigned(190)).toBe(-170);
    expect(wrapDomeAngleSigned(-190)).toBe(170);
    expect(clampDome(99, 0, 5)).toBe(5);
  });

  it("derives base rotation from grid offsets", () => {
    const { rotateX, rotateY } = domeTileBaseRotation(0, 0, 2, 2, 35);
    const unit = 360 / 35 / 2;
    expect(rotateY).toBeCloseTo(unit * 0.5, 9);
    expect(rotateX).toBeCloseTo(unit * -0.5, 9);
  });

  it("keeps only front-centre tiles keyboard reachable", () => {
    expect(isDomeTileFocusable(0)).toBe(true);
    expect(isDomeTileFocusable(8)).toBe(true);
    expect(isDomeTileFocusable(9)).toBe(false);
    expect(isDomeTileFocusable(-37)).toBe(false);
  });
});
