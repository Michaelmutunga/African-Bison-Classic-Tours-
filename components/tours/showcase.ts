/**
 * Tours showcase shared model (tours listing revamp).
 *
 * Pure, serializable types and helpers shared by the server page
 * (which resolves imagery once per request) and the client explorer
 * (wheel selection, stack order). No React, no motion, no `any`.
 */

export interface ShowcaseImage {
  src: string;
  alt: string;
  focal: string;
}

export interface ShowcaseTour {
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  durationDays: number;
  excerpt: string;
  image: ShowcaseImage | null;
}

export interface ShowcaseCategory {
  slug: string;
  label: string;
  count: number;
}

export const ALL_SLUG = "all";
export const ALL_LABEL = "All safaris";

/** Filter tours to the active wheel selection. `all` returns everything. */
export function filterShowcaseTours(
  tours: ShowcaseTour[],
  active: string,
): ShowcaseTour[] {
  if (active === ALL_SLUG) return tours;
  return tours.filter((tour) => tour.categorySlug === active);
}

/** Min and max duration in days across a list. Null-safe for empty lists. */
export function durationRange(tours: ShowcaseTour[]): {
  min: number | null;
  max: number | null;
} {
  if (tours.length === 0) return { min: null, max: null };
  let min = tours[0].durationDays;
  let max = tours[0].durationDays;
  for (const tour of tours) {
    if (tour.durationDays < min) min = tour.durationDays;
    if (tour.durationDays > max) max = tour.durationDays;
  }
  return { min, max };
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Wheel geometry: angle in degrees for option `index` of `total`,
 * measured from the top (-90deg) clockwise. The ring rotates by
 * `-activeIndex * step` so the active option always sits at the top.
 */
export function wheelOptionAngle(index: number, total: number): number {
  if (total <= 0) return -90;
  return -90 + index * (360 / total);
}

/** Ring rotation that brings `activeIndex` to the top. */
export function wheelRingRotation(activeIndex: number, total: number): number {
  if (total <= 0) return 0;
  return -activeIndex * (360 / total);
}

/** Position on the unit circle as percentages for CSS left/top. */
export function wheelPointPosition(
  angleDegrees: number,
  radiusPercent: number,
): { left: number; top: number } {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    left: 50 + radiusPercent * Math.cos(radians),
    top: 50 + radiusPercent * Math.sin(radians),
  };
}

/** Rotate a stack order forward: front card goes to the back. */
export function rotateStackForward(order: number[]): number[] {
  if (order.length < 2) return [...order];
  return [...order.slice(1), order[0]];
}

/** Rotate a stack order backward: back card returns to the front. */
export function rotateStackBackward(order: number[]): number[] {
  if (order.length < 2) return [...order];
  return [order[order.length - 1], ...order.slice(0, order.length - 1)];
}

/**
 * Bring `target` to the front by rotating forward. Bounded so a stale
 * index can never spin the deck forever.
 */
export function bringStackToFront(order: number[], target: number): number[] {
  let next = [...order];
  for (let step = 0; step < order.length; step++) {
    if (next[0] === target) return next;
    next = rotateStackForward(next);
  }
  return [...order];
}

/** Identity order for a deck of `size` cards: [0, 1, ...]. */
export function identityStackOrder(size: number): number[] {
  return Array.from({ length: Math.max(0, size) }, (_, i) => i);
}

/** Index of `slug` inside the wheel options, falling back to All (0). */
export function wheelIndexForSlug(slugs: string[], slug: string): number {
  const found = slugs.indexOf(slug);
  return found === -1 ? 0 : found;
}

/** Clamp an index into range using modular arithmetic. */
export function clampWheelIndex(index: number, total: number): number {
  if (total <= 0) return 0;
  return mod(index, total);
}
