import { seededRandom, shuffled } from "../random";

/**
 * Block Fit puzzles (spec 22): a rectangle cut into connected pieces of 3 to
 * 5 squares. A piece is its squares as [row, col] pairs, top-left at 0, 0.
 */
export type Cell = [number, number];
export type Piece = {
  id: number;
  cells: Cell[];
  /**
   * Picture puzzles only: where each of `cells` (same order) sits on the
   * board when the picture is whole, and how many quarter turns the piece was
   * dealt with, so its photo slices turn with it.
   */
  slices?: Cell[];
  spin?: number;
};
export type Placement = { piece: number; turns: number; row: number; col: number };

export const MIN_PIECE = 3;
export const MAX_PIECE = 5;

/** Moves a shape so its top-left is 0, 0, in a fixed order (so equal shapes compare equal). */
export function normalize(cells: Cell[]): Cell[] {
  const r0 = Math.min(...cells.map((c) => c[0]));
  const c0 = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]): Cell => [r - r0, c - c0]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** The squares in row-then-column order (where they are is kept). */
const normalizeOrder = (cells: Cell[]): Cell[] =>
  cells.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);

/** A shape turned a quarter turn clockwise, `turns` times, top-left at 0, 0, its squares in the order given. */
export function turnCells(cells: Cell[], turns: number): Cell[] {
  let out = cells;
  for (let t = 0; t < ((turns % 4) + 4) % 4; t++) out = out.map(([r, c]): Cell => [c, -r]);
  const r0 = Math.min(...out.map((c) => c[0]));
  const c0 = Math.min(...out.map((c) => c[1]));
  return out.map(([r, c]): Cell => [r - r0, c - c0]);
}

/** A shape turned a quarter turn clockwise, `turns` times. */
export function rotate(cells: Cell[], turns: number): Cell[] {
  return normalize(turnCells(cells, turns));
}

/**
 * Cuts a width × height board into connected pieces of 3 to 5 squares: each
 * piece grows from the first free square in random directions, and a cut that
 * leaves a too-small piece is thrown away and tried again (S22-AC1).
 */
export function cutBoard(
  width: number,
  height: number,
  seed: number,
): (Piece & { slices: Cell[] })[] {
  const random = seededRandom(seed);
  const total = width * height;
  for (let attempt = 0; attempt < 500; attempt++) {
    const owner = new Array<number>(total).fill(-1);
    const pieces: number[][] = [];
    let ok = true;
    for (let start = owner.indexOf(-1); start >= 0; start = owner.indexOf(-1)) {
      const want = MIN_PIECE + Math.floor(random() * (MAX_PIECE - MIN_PIECE + 1));
      const id = pieces.length;
      const cells = [start];
      owner[start] = id;
      while (cells.length < want) {
        const frontier = shuffled(
          cells.flatMap((cell) => {
            const r = Math.floor(cell / width);
            const c = cell % width;
            return [
              r > 0 ? cell - width : -1,
              r < height - 1 ? cell + width : -1,
              c > 0 ? cell - 1 : -1,
              c < width - 1 ? cell + 1 : -1,
            ].filter((n) => n >= 0 && owner[n] === -1);
          }),
          random,
        );
        const next = frontier[0];
        if (next === undefined) break;
        owner[next] = id;
        cells.push(next);
      }
      if (cells.length < MIN_PIECE) {
        ok = false;
        break;
      }
      pieces.push(cells);
    }
    if (ok)
      return pieces.map((cells, id) => {
        const slices = normalizeOrder(cells.map((n): Cell => [Math.floor(n / width), n % width]));
        return { id, cells: normalize(slices), slices };
      });
  }
  throw new Error("Couldn't cut the board");
}

/** Why placements don't fill the board exactly, or null when they do (S22-AC2). */
export function checkPlacements(
  width: number,
  height: number,
  pieces: Piece[],
  placements: Placement[],
): string | null {
  if (
    placements.length !== pieces.length ||
    new Set(placements.map((p) => p.piece)).size !== pieces.length
  )
    return "Place every piece once.";
  const used = new Set<number>();
  for (const p of placements) {
    const piece = pieces.find((x) => x.id === p.piece);
    if (!piece) return "That piece isn't in this puzzle.";
    for (const [r, c] of rotate(piece.cells, p.turns)) {
      const [row, col] = [r + p.row, c + p.col];
      if (row < 0 || col < 0 || row >= height || col >= width)
        return "A piece hangs off the board.";
      const key = row * width + col;
      if (used.has(key)) return "Two pieces overlap.";
      used.add(key);
    }
  }
  return used.size === width * height ? null : "Fill every square.";
}

/** A solution by search: fills the first empty square with each piece, each way round. For tests and checks. */
export function solveBlocks(width: number, height: number, pieces: Piece[]): Placement[] | null {
  const filled = new Array<boolean>(width * height).fill(false);
  const used = new Set<number>();
  const out: Placement[] = [];
  const go = (): boolean => {
    const empty = filled.indexOf(false);
    if (empty < 0) return used.size === pieces.length;
    const [er, ec] = [Math.floor(empty / width), empty % width];
    for (const piece of pieces) {
      if (used.has(piece.id)) continue;
      const seen = new Set<string>();
      for (let turns = 0; turns < 4; turns++) {
        const shape = rotate(piece.cells, turns);
        const key = JSON.stringify(shape);
        if (seen.has(key)) continue;
        seen.add(key);
        // The shape's first square (row by row) goes on the first empty square.
        const [fr, fc] = shape[0] as Cell;
        const [row, col] = [er - fr, ec - fc];
        const squares = shape.map(([r, c]) => [r + row, c + col] as Cell);
        if (
          squares.some(
            ([r, c]) => r < 0 || c < 0 || r >= height || c >= width || filled[r * width + c],
          )
        )
          continue;
        for (const [r, c] of squares) filled[r * width + c] = true;
        used.add(piece.id);
        out.push({ piece: piece.id, turns, row, col });
        if (go()) return true;
        out.pop();
        used.delete(piece.id);
        for (const [r, c] of squares) filled[r * width + c] = false;
      }
    }
    return false;
  };
  return go() ? out : null;
}
