import { seededRandom, shuffled } from "./random";

/**
 * The dealing for the counting games (specs 25 and 30): Fly-by Count and
 * Snow Sum. The showdowns (lib/live) and the solo versions
 * (./perception/counts.ts) both deal from here, so a seed gives the same
 * round either way (ADR-041).
 */

// ---- Fly-by Count

/**
 * The kinds of present (Khai, 2026-11-24): each has its own wrapping and a
 * second signal besides color (a bow, a ribbon, stripes), and a name the
 * question uses.
 */
export const PRESENT_KINDS = ["red", "white", "green"] as const;
export type PresentKind = (typeof PRESENT_KINDS)[number];

export const FLYBY_ROUNDS = [
  { min: 6, max: 12, ms: 4000, cols: 6, rows: 3, kinds: 1 },
  { min: 10, max: 18, ms: 3500, cols: 8, rows: 3, kinds: 2 },
  { min: 15, max: 25, ms: 3000, cols: 10, rows: 4, kinds: 3 },
];

/** A round: how many presents, how long they fly, the grid, and how many kinds (1: count them all). */
export type FlybyRound = {
  min: number;
  max: number;
  ms: number;
  cols: number;
  rows: number;
  kinds?: number;
};

/**
 * The presents in a gappy grid: [row, col, kind] of each, and each row's
 * half-square shift. `ask` is the kind the question asks about (null: all of
 * them), and `count` the answer: how many of that kind.
 */
export type Formation = {
  count: number;
  ask: number | null;
  cols: number;
  rows: number;
  cells: [number, number, number][];
  offsets: number[];
};

function dealOnce(seed: number, r: FlybyRound): Formation {
  const random = seededRandom(seed);
  const total = r.min + Math.floor(random() * (r.max - r.min + 1));
  const kinds = Math.max(1, Math.min(PRESENT_KINDS.length, r.kinds ?? 1));
  const all: [number, number][] = [];
  for (let row = 0; row < r.rows; row++)
    for (let col = 0; col < r.cols; col++) all.push([row, col]);
  const spots = shuffled(all, random).slice(0, total);
  // Every kind shows at least once, so whichever is asked about is there to count.
  const cells = spots
    .map(([row, col], i): [number, number, number] => [
      row,
      col,
      i < kinds ? i : Math.floor(random() * kinds),
    ])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const offsets = Array.from({ length: r.rows }, () => (random() < 0.5 ? 0 : 0.5));
  const ask = kinds > 1 ? Math.floor(random() * kinds) : null;
  const count = ask === null ? cells.length : cells.filter((c) => c[2] === ask).length;
  return { count, ask, cols: r.cols, rows: r.rows, cells, offsets };
}

/**
 * A round's presents from the seed. With `avoid`, the answer is never the
 * same as the last round's (Khai, 2026-11-24), by trying the next seeds.
 */
export function dealFormation(seed: number, r: FlybyRound, avoid: number | null = null): Formation {
  let f = dealOnce(seed, r);
  for (let i = 1; i < 20 && avoid !== null && f.count === avoid; i++) f = dealOnce(seed + i, r);
  return f;
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
