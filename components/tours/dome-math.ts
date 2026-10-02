/**
 * Dome gallery geometry (tours listing revamp).
 *
 * Pure helpers behind the DomeGallery port: tile layout on the sphere,
 * base rotations, and pool cycling. React-free so unit tests can cover
 * the layout without a DOM. No `any`.
 */

export interface DomePoolEntry {
  src: string;
  alt: string;
  slug: string;
  title: string;
  days: number;
  categoryLabel: string;
}

export interface DomeTile extends DomePoolEntry {
  x: number;
  y: number;
  sizeX: number;
  sizeY: number;
}

export function clampDome(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeDomeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function wrapDomeAngleSigned(degrees: number): number {
  const wrapped = (((degrees + 180) % 360) + 360) % 360;
  return wrapped - 180;
}

/**
 * Lay `pool` entries out on the dome grid. Columns run from -37 to +35
 * in steps of 2; even columns take one set of rows, odd columns the
 * offset set, so neighbours never align. The pool cycles when there are
 * fewer entries than slots, with adjacent duplicates swapped apart.
 */
export function buildDomeTiles(
  pool: DomePoolEntry[],
  segments: number,
): DomeTile[] {
  const safeSegments = Math.max(1, Math.floor(segments));
  const columns = Array.from(
    { length: safeSegments },
    (_, i) => -37 + i * 2,
  );
  const evenRows = [-4, -2, 0, 2, 4];
  const oddRows = [-3, -1, 1, 3, 5];
  const coords = columns.flatMap((x, column) => {
    const rows = column % 2 === 0 ? evenRows : oddRows;
    return rows.map((y) => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  if (pool.length === 0) {
    return coords.map((c) => ({
      ...c,
      src: "",
      alt: "",
      slug: "",
      title: "",
      days: 0,
      categoryLabel: "",
    }));
  }

  const used = Array.from(
    { length: coords.length },
    (_, i) => pool[i % pool.length],
  );
  for (let i = 1; i < used.length; i++) {
    if (used[i].src === used[i - 1].src) {
      for (let j = i + 1; j < used.length; j++) {
        if (used[j].src !== used[i].src) {
          const tmp = used[i];
          used[i] = used[j];
          used[j] = tmp;
          break;
        }
      }
    }
  }
  return coords.map((c, i) => ({ ...c, ...used[i] }));
}

/** Base sphere rotation for a tile from its grid offset and size. */
export function domeTileBaseRotation(
  offsetX: number,
  offsetY: number,
  sizeX: number,
  sizeY: number,
  segments: number,
): { rotateX: number; rotateY: number } {
  const unit = 360 / Math.max(1, segments) / 2;
  return {
    rotateY: unit * (offsetX + (sizeX - 1) / 2),
    rotateX: unit * (offsetY - (sizeY - 1) / 2),
  };
}

/** Tiles near the front centre stay keyboard reachable; the rest park. */
export function isDomeTileFocusable(offsetX: number): boolean {
  return Math.abs(offsetX) <= 8;
}
