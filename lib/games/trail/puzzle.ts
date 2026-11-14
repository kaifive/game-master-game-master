import { seededRandom, shuffled } from "../random";

/**
 * Pathfinder puzzles (spec 16): a path through every square of a grid,
 * visiting numbered dots in order. Squares are numbered row by row from 0.
 */
export type Puzzle = { size: number; dots: number[] };

export const neighbours = (cell: number, size: number): number[] => {
  const r = Math.floor(cell / size);
  const c = cell % size;
  return [
    r > 0 ? cell - size : -1,
    r < size - 1 ? cell + size : -1,
    c > 0 ? cell - 1 : -1,
    c < size - 1 ? cell + 1 : -1,
  ].filter((n) => n >= 0);
};

export const adjacent = (a: number, b: number, size: number) => neighbours(a, size).includes(b);

/**
 * A random path through every square: a walk that always steps to the
 * neighbour with the fewest ways onward (Warnsdorff), ties broken by the seed,
 * backtracking when stuck. Returns null only if every try fails (it doesn't
 * for grids up to 8×8; the tests check many seeds).
 */
export function wholePath(size: number, random: () => number, tries = 50): number[] | null {
  const total = size * size;
  for (let attempt = 0; attempt < tries; attempt++) {
    const start = Math.floor(random() * total);
    const path = [start];
    const used = new Set(path);
    let budget = 20_000;
    const extend = (): boolean => {
      if (path.length === total) return true;
      if (budget-- <= 0) return false;
      const here = path[path.length - 1] as number;
      const options = shuffled(
        neighbours(here, size).filter((n) => !used.has(n)),
        random,
      ).sort(
        (a, b) =>
          neighbours(a, size).filter((n) => !used.has(n)).length -
          neighbours(b, size).filter((n) => !used.has(n)).length,
      );
      for (const next of options) {
        path.push(next);
        used.add(next);
        if (extend()) return true;
        path.pop();
        used.delete(next);
      }
      return false;
    };
    if (extend()) return path;
  }
  return null;
}

/** A puzzle from a seed: a whole path, with `count` dots spread along it, first and last at its ends. */
export function makePuzzle(size: number, count: number, seed: number): Puzzle & { path: number[] } {
  const random = seededRandom(seed);
  const path = wholePath(size, random);
  if (!path) throw new Error(`Couldn't make a ${String(size)}×${String(size)} trail.`);
  const last = path.length - 1;
  const dots = Array.from({ length: count }, (_, i) => {
    if (i === 0) return path[0] as number;
    if (i === count - 1) return path[last] as number;
    // Evenly spaced, nudged a square or two by the seed so puzzles don't feel regular.
    const at = Math.round((i * last) / (count - 1)) + Math.round(random() * 2 - 1);
    return path[Math.min(last - 1, Math.max(1, at))] as number;
  });
  return { size, dots, path };
}

/** Why a path doesn't solve the puzzle, or null when it does (S16-AC4). */
export function checkPath(p: Puzzle, path: number[]): string | null {
  const total = p.size * p.size;
  if (path.length !== total) return "Fill every square.";
  if (new Set(path).size !== total || path.some((c) => c < 0 || c >= total))
    return "Visit each square once.";
  for (let i = 1; i < path.length; i++)
    if (!adjacent(path[i - 1] as number, path[i] as number, p.size))
      return "Move one square at a time, up, down or sideways.";
  if (path[0] !== p.dots[0] || path[path.length - 1] !== p.dots[p.dots.length - 1])
    return "Start on 1 and end on the last number.";
  const order = p.dots.map((d) => path.indexOf(d));
  if (order.some((at, i) => i > 0 && at < (order[i - 1] as number)))
    return "Pass the numbers in order.";
  return null;
}

/** How each numbered dot stands on a trail being drawn (S16-AC9). */
export type DotMark = "idle" | "passed" | "skipped";

/**
 * Walks the trail: a dot reached in order is passed; reaching a later dot
 * first skips the ones it jumped. After a skip nothing more counts as passed
 * until the trail is undone back past it.
 */
export function dotMarks(path: number[], dots: number[]): DotMark[] {
  const marks: DotMark[] = dots.map(() => "idle");
  let next = 0;
  let broken = false;
  for (const cell of path) {
    const k = dots.indexOf(cell);
    if (k < 0) continue;
    if (!broken && k === next) {
      marks[k] = "passed";
      next++;
    } else if (k > next) {
      for (let j = next; j < k; j++) if (marks[j] === "idle") marks[j] = "skipped";
      broken = true;
    }
  }
  return marks;
}

/** Which way the trail's last step points, in degrees: up 0, right 90, down 180, left 270 (S16-AC10). */
export function facing(path: number[], size: number): number {
  if (path.length < 2) return 0;
  const step = (path[path.length - 1] as number) - (path[path.length - 2] as number);
  return step === 1 ? 90 : step === size ? 180 : step === -1 ? 270 : 0;
}

/** The angle to turn to, from `angle`, to face `direction` the short way round. */
export function turnToward(angle: number, direction: number): number {
  const now = ((angle % 360) + 360) % 360;
  const delta = ((((direction - now) % 360) + 540) % 360) - 180;
  return angle + delta;
}
