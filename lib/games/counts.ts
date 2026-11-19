import { seededRandom, shuffled } from "./random";

/**
 * The dealing for the counting games (specs 25 and 30): Fly-by Count, Snow
 * Sum and Color Count. The showdowns (lib/live) and the solo versions
 * (./perception/counts.ts) both deal from here, so a seed gives the same
 * round either way (ADR-041).
 */

// ---- Fly-by Count

export const FLYBY_ROUNDS = [
  { min: 6, max: 12, ms: 4000, cols: 6, rows: 3 },
  { min: 10, max: 18, ms: 3500, cols: 8, rows: 3 },
  { min: 15, max: 25, ms: 3000, cols: 10, rows: 4 },
];

export type FlybyRound = { min: number; max: number; ms: number; cols: number; rows: number };

/** The presents in a gappy grid: [row, col] of each, and each row's half-square shift. */
export type Formation = {
  count: number;
  cols: number;
  rows: number;
  cells: [number, number][];
  offsets: number[];
};

export function dealFormation(seed: number, r: FlybyRound): Formation {
  const random = seededRandom(seed);
  const count = r.min + Math.floor(random() * (r.max - r.min + 1));
  const all: [number, number][] = [];
  for (let row = 0; row < r.rows; row++)
    for (let col = 0; col < r.cols; col++) all.push([row, col]);
  const cells = shuffled(all, random)
    .slice(0, count)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const offsets = Array.from({ length: r.rows }, () => (random() < 0.5 ? 0 : 0.5));
  return { count, cols: r.cols, rows: r.rows, cells, offsets };
}

// ---- Snow Sum

export const SNOW_OPS = ["add", "sub", "double"] as const;
export type SnowOp = (typeof SNOW_OPS)[number];
export type Flake = { op: SnowOp; n: number };

/** Totals never leave this range (spec 25). */
export const SNOW_MIN = -50;
export const SNOW_MAX = 200;

export const SNOW_ROUNDS = [
  { flakes: 5, ops: ["add", "sub"] as SnowOp[] },
  { flakes: 7, ops: ["add", "sub"] as SnowOp[] },
  { flakes: 8, ops: ["add", "sub", "double"] as SnowOp[] },
];

export const apply = (total: number, f: Flake) =>
  f.op === "add" ? total + f.n : f.op === "sub" ? total - f.n : total * 2;

/** The flakes for one round, from the seed, keeping every running total in range. */
export function dealFlakes(seed: number, flakes: number, ops: readonly SnowOp[]): Flake[] {
  const random = seededRandom(seed);
  const out: Flake[] = [];
  let total = 0;
  for (let i = 0; i < flakes; i++) {
    // Doubling 0 or a negative is no fun to count; doubling twice running is too hard.
    const allowed = ops.filter(
      (op) =>
        op !== "double" ||
        (total > 0 && total * 2 <= SNOW_MAX && out[out.length - 1]?.op !== "double"),
    );
    const pick = (list: readonly SnowOp[]): SnowOp =>
      list[Math.floor(random() * list.length)] ?? "add";
    // Taking away from nothing is no fun to count, so at 0 or below it adds.
    let op = total <= 0 ? "add" : pick(allowed.length > 0 ? allowed : ["add"]);
    let n =
      op === "add" ? 1 + Math.floor(random() * 9) : op === "sub" ? 1 + Math.floor(random() * 5) : 2;
    if (apply(total, { op, n }) < SNOW_MIN) op = "add";
    if (apply(total, { op, n }) > SNOW_MAX) op = "sub";
    if (op === "double") n = 2;
    out.push({ op, n });
    total = apply(total, { op, n });
  }
  return out;
}

export const sum = (flakes: readonly Flake[]) => flakes.reduce(apply, 0);

/** The total after each flake, for the reveal. */
export const runningTotals = (flakes: readonly Flake[]): number[] =>
  flakes.reduce<number[]>((acc, f) => [...acc, apply(acc[acc.length - 1] ?? 0, f)], []);

// ---- Color Count

export const ORNAMENT_COLORS = ["red", "green", "blue", "gold", "purple"] as const;
export type OrnamentColor = (typeof ORNAMENT_COLORS)[number];

/** One flash: a few ornaments, each with its color and spot on the TV (0 to 1 each way). */
export type Flash = { color: number; x: number; y: number }[];

export const COLOR_ROUNDS = [
  { colors: 3, count: 12, ms: 4000 },
  { colors: 4, count: 18, ms: 3500 },
  { colors: 5, count: 24, ms: 3000 },
];

/** The flashes for one round: every color shows at least once, 2 or 3 ornaments at a time. */
export function dealFlashes(seed: number, colors: number, count: number) {
  const random = seededRandom(seed);
  const picks = Array.from({ length: count }, (_, i) =>
    i < colors ? i : Math.floor(random() * colors),
  );
  const order = shuffled(picks, random);
  const flashes: Flash[] = [];
  for (let i = 0; i < order.length;) {
    const size = Math.min(order.length - i, 2 + Math.floor(random() * 2));
    // Spots spread across the screen, apart from each other.
    const slots = shuffled([0, 1, 2, 3, 4, 5], random).slice(0, size);
    flashes.push(
      order.slice(i, i + size).map((color, j) => ({
        color,
        x: ((slots[j] ?? 0) % 3) / 3 + 0.08 + random() * 0.17,
        y: Math.floor((slots[j] ?? 0) / 3) / 2 + 0.08 + random() * 0.25,
      })),
    );
    i += size;
  }
  const ask = Math.floor(random() * colors);
  return { flashes, ask, truth: order.filter((c) => c === ask).length };
}
