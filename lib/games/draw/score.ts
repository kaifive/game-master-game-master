/**
 * Quick Draw's judge (spec 18): how close a drawing from memory is to a
 * reference outline. Both are fitted to the same grid (so size and position
 * don't matter), then compared with a little tolerance:
 * - precision: how much of the ink lands near the reference's lines;
 * - recall: how much of the reference the ink comes near, with the inner
 *   shapes counting more than the outer ring (a circle alone isn't the logo).
 * The match is their geometric mean, mapped to a share of the points.
 */
export type Point = [number, number];
export type Reference = { size: number; edges: number[] };

/** Grid squares of slack between a line and the reference. */
export const TOLERANCE = 2;
/** Ink beyond this many times the reference's lines counts against the drawing (a scribble covers everything). */
export const INK_LIMIT = 1.2;
/** The outer ring is everything this far from the centre (as a share of the half-width). */
export const RING_FROM = 0.84;
export const RING_WEIGHT = 0.15;
/** Matches at or below LOW earn nothing; at or above HIGH, everything. Tuned forgiving (Khai: too hard). */
export const LOW = 0.42;
export const HIGH = 0.85;

/** Ink on the grid: the strokes fitted to fill it, keeping their shape. */
export function rasterize(strokes: Point[][], size: number): Set<number> {
  const all = strokes.flat();
  const ink = new Set<number>();
  if (all.length === 0) return ink;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const side = Math.max(maxX - minX, maxY - minY) || 1;
  const fit = (p: Point): Point => [
    ((p[0] - minX + (side - (maxX - minX)) / 2) / side) * (size - 1),
    ((p[1] - minY + (side - (maxY - minY)) / 2) / side) * (size - 1),
  ];
  const plot = (x: number, y: number) => {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (cx >= 0 && cy >= 0 && cx < size && cy < size) ink.add(cy * size + cx);
  };
  for (const stroke of strokes) {
    const pts = stroke.map(fit);
    if (pts.length === 1) plot(pts[0]?.[0] ?? 0, pts[0]?.[1] ?? 0);
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1] as Point;
      const [bx, by] = pts[i] as Point;
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let s = 0; s <= steps; s++)
        plot(ax + ((bx - ax) * s) / steps, ay + ((by - ay) * s) / steps);
    }
  }
  return ink;
}

/** Every square's distance (in steps, diagonals counting one) to the nearest of `cells`. */
function distances(cells: Set<number>, size: number): Int32Array {
  const dist = new Int32Array(size * size).fill(-1);
  let frontier = [...cells];
  for (const c of frontier) dist[c] = 0;
  for (let d = 1; frontier.length > 0; d++) {
    const next: number[] = [];
    for (const c of frontier) {
      const x = c % size;
      const y = Math.floor(c / size);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
          const n = ny * size + nx;
          if (dist[n] !== -1) continue;
          dist[n] = d;
          next.push(n);
        }
    }
    frontier = next;
  }
  return dist;
}

/** How well a drawing matches, from 0 to 1, before mapping to points. */
export function matchOf(strokes: Point[][], ref: Reference): number {
  const ink = rasterize(strokes, ref.size);
  if (ink.size === 0) return 0;
  const edges = new Set(ref.edges);
  const toRef = distances(edges, ref.size);
  const toInk = distances(ink, ref.size);
  const near = (d: number) => d >= 0 && d <= TOLERANCE;
  const precision = [...ink].filter((c) => near(toRef[c] ?? -1)).length / ink.size;
  const half = (ref.size - 1) / 2;
  const onRing = (c: number) =>
    Math.hypot((c % ref.size) - half, Math.floor(c / ref.size) - half) >= RING_FROM * half;
  const ring = ref.edges.filter(onRing);
  const inner = ref.edges.filter((c) => !onRing(c));
  const found = (cells: number[]) =>
    cells.length === 0 ? 1 : cells.filter((c) => near(toInk[c] ?? -1)).length / cells.length;
  const recall = RING_WEIGHT * found(ring) + (1 - RING_WEIGHT) * found(inner);
  const overInk = Math.min(1, (INK_LIMIT * ref.edges.length) / ink.size);
  return Math.sqrt(precision * recall) * overInk;
}

/** The share of points for a match (S18-AC4). */
export const drawShare = (match: number) => Math.min(1, Math.max(0, (match - LOW) / (HIGH - LOW)));
