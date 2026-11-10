/**
 * Quick Draw's judge (spec 18): how close a drawing from memory is to a
 * reference outline. Both are fitted to the same grid (so size and position
 * don't matter), then compared with a little tolerance:
 * - precision: how much of the ink lands near the reference's lines (half
 *   credit one square further out, so a near miss isn't all-or-nothing);
 * - recall: how much of the reference the ink comes near, with the inner
 *   shapes counting more than the outer ring (a circle alone isn't the logo).
 * The match is their geometric mean, mapped to a share of the points.
 */
export type Point = [number, number];
export type Reference = { size: number; edges: number[] };

/** Lines this many grid squares from the reference count fully; one square further, half. */
export const TOLERANCE = 2;
/** Ink beyond this many times the reference's lines counts against the drawing (a scribble covers everything). */
export const INK_LIMIT = 1.2;
/** The outer ring is everything this far from the centre (as a share of the half-width). */
export const RING_FROM = 0.84;
export const RING_WEIGHT = 0.15;
/**
 * Matches at or below LOW earn nothing; at or above HIGH, everything. Tuned
 * 2026-11-10 (Khai: scores felt random): a careful hand drawing ~0.85-0.9,
 * a circle alone ~0.38, a ring with a cross ~0.59.
 */
export const LOW = 0.55;
export const HIGH = 0.9;
/** The outer share of the ink, each side, left out when sizing the drawing: a stray mark doesn't shrink it. */
const TRIM = 0.015;

const credit = (d: number) => (d < 0 ? 0 : d <= TOLERANCE ? 1 : d === TOLERANCE + 1 ? 0.5 : 0);

/** Points every `step` along each stroke, so ink weighs by length, not by how fast it was drawn. */
function resample(strokes: Point[][], step: number): Point[] {
  const out: Point[] = [];
  for (const s of strokes) {
    if (s[0]) out.push(s[0]);
    for (let i = 1; i < s.length; i++) {
      const [ax, ay] = s[i - 1] as Point;
      const [bx, by] = s[i] as Point;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step));
      for (let k = 1; k <= n; k++) out.push([ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n]);
    }
  }
  return out;
}

const at = (sorted: number[], share: number) =>
  sorted[Math.round(share * (sorted.length - 1))] ?? 0;

/**
 * Ink on the grid: the strokes fitted to fill it, keeping their shape. The
 * fit ignores the outermost 1.5% of the ink on each side, so one stray mark
 * can't shrink the whole drawing (Khai, 2026-11-10: scores felt random).
 */
export function rasterize(strokes: Point[][], size: number): Set<number> {
  const ink = new Set<number>();
  const raw = strokes.flat();
  if (raw.length === 0) return ink;
  const span =
    Math.max(
      Math.max(...raw.map((p) => p[0])) - Math.min(...raw.map((p) => p[0])),
      Math.max(...raw.map((p) => p[1])) - Math.min(...raw.map((p) => p[1])),
    ) || 1;
  const length = strokes.reduce(
    (sum, s) =>
      sum +
      s
        .slice(1)
        .reduce((l, p, i) => l + Math.hypot(p[0] - (s[i]?.[0] ?? 0), p[1] - (s[i]?.[1] ?? 0)), 0),
    0,
  );
  // Fine enough to leave no gaps on the grid, capped so a scribble judges fast.
  const pts = resample(strokes, Math.max(span / (size * 4), length / 4000));
  const xs = pts.map((p) => p[0]).sort((a, b) => a - b);
  const ys = pts.map((p) => p[1]).sort((a, b) => a - b);
  const [x0, x1, y0, y1] = [at(xs, TRIM), at(xs, 1 - TRIM), at(ys, TRIM), at(ys, 1 - TRIM)];
  const side = Math.max(x1 - x0, y1 - y0) || 1;
  const half = (size - 1) / 2;
  for (const [px, py] of pts) {
    const x = Math.round(half + ((px - (x0 + x1) / 2) / side) * (size - 1));
    const y = Math.round(half + ((py - (y0 + y1) / 2) / side) * (size - 1));
    if (x >= 0 && y >= 0 && x < size && y < size) ink.add(y * size + x);
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
  let near = 0;
  for (const c of ink) near += credit(toRef[c] ?? -1);
  const precision = near / ink.size;
  const half = (ref.size - 1) / 2;
  const onRing = (c: number) =>
    Math.hypot((c % ref.size) - half, Math.floor(c / ref.size) - half) >= RING_FROM * half;
  const ring = ref.edges.filter(onRing);
  const inner = ref.edges.filter((c) => !onRing(c));
  const found = (cells: number[]) =>
    cells.length === 0
      ? 1
      : cells.reduce((sum, c) => sum + credit(toInk[c] ?? -1), 0) / cells.length;
  const recall = RING_WEIGHT * found(ring) + (1 - RING_WEIGHT) * found(inner);
  const overInk = Math.min(1, (INK_LIMIT * ref.edges.length) / ink.size);
  return Math.sqrt(precision * recall) * overInk;
}

/** The share of points for a match (S18-AC4). */
export const drawShare = (match: number) => Math.min(1, Math.max(0, (match - LOW) / (HIGH - LOW)));
