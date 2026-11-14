import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { seededRandom } from "../random";
import { solveAndSpeedShare } from "../speed";

/** Number Slide (spec 21): slide the numbered tiles back into order. */
export const SlideContent = z
  .object({
    size: z.number().int().min(3).max(4).optional(),
    scramble: z.number().int().min(20).max(400).optional(),
  })
  .strict();
export type SlideContent = z.infer<typeof SlideContent>;

const sizeOf = (c: SlideContent) => c.size ?? 3;

/** All the speed points within this; none at SLOW_MS (S21-AC3). */
export const FAST_MS = 30_000;
export const SLOW_MS = 180_000;

/** A board, row by row; 0 is the gap. */
export type Board = number[];

export const solvedBoard = (size: number): Board =>
  Array.from({ length: size * size }, (_, i) => (i === size * size - 1 ? 0 : i + 1));

export const isSolved = (board: Board) =>
  board.every((v, i) => v === (i === board.length - 1 ? 0 : i + 1));

/**
 * Slides the tapped tile toward the gap, with any tiles between them, when
 * it shares the gap's row or column. Returns null for any other tap.
 */
export function slide(board: Board, size: number, tile: number): Board | null {
  const at = board.indexOf(tile);
  const gap = board.indexOf(0);
  if (tile === 0 || at < 0) return null;
  const [r, c, gr, gc] = [Math.floor(at / size), at % size, Math.floor(gap / size), gap % size];
  if (r !== gr && c !== gc) return null;
  const step = r === gr ? (c < gc ? -1 : 1) : r < gr ? -size : size;
  const next = board.slice();
  // Walk from the gap toward the tapped tile, pulling each tile into the hole.
  for (let hole = gap; hole !== at; hole += step) {
    next[hole] = next[hole + step] as number;
    next[hole + step] = 0;
  }
  return next;
}

/** A scrambled board: legal slides from solved, never undoing the last, never left solved (S21-AC1). */
export function scrambled(size: number, moves: number, seed: number): Board {
  const random = seededRandom(seed);
  let board = solvedBoard(size);
  let last = -1;
  for (let i = 0; i < moves || isSolved(board); i++) {
    const gap = board.indexOf(0);
    const [gr, gc] = [Math.floor(gap / size), gap % size];
    const options = [
      gr > 0 ? gap - size : -1,
      gr < size - 1 ? gap + size : -1,
      gc > 0 ? gap - 1 : -1,
      gc < size - 1 ? gap + 1 : -1,
    ].filter((n) => n >= 0 && board[n] !== last);
    const pick = options[Math.floor(random() * options.length)] as number;
    last = board[pick] as number;
    board = slide(board, size, last) ?? board;
  }
  return board;
}

export type SlideState = {
  size: number;
  start: Board;
  startedAt: number;
  phase: "playing" | "solved";
  tookMs: number | null;
  moves: number | null;
  step: number;
};

export type SlideView =
  | { kind: "playing"; size: number; board: Board; elapsedMs: number }
  | { kind: "done"; size: number; tookMs: number | null; moves: number | null };

const Move = z.object({
  type: z.literal("solve"),
  taps: z.array(z.number().int().min(1).max(15)).min(1).max(3000),
});
const fail = (message: string): MoveResult<SlideState> => ({ ok: false, message });

export const slideShare = (tookMs: number) => solveAndSpeedShare(tookMs, FAST_MS, SLOW_MS);

export const slideGame: GameLogic<SlideContent, SlideState, SlideView> = {
  content: SlideContent,
  instructions: (c) => ({
    title: "How to play",
    lines: [
      `Put the tiles back in order, 1 to ${String(sizeOf(c) * sizeOf(c) - 1)}, with the gap last.`,
      "Tap a tile next to the gap (or in its row or column) to slide it.",
      "Solving it scores half the points. Solving it fast scores the rest.",
    ],
  }),
  create: (c, seed, { now }) => ({
    size: sizeOf(c),
    start: scrambled(sizeOf(c), c.scramble ?? 80, seed),
    startedAt: now,
    phase: "playing",
    tookMs: null,
    moves: null,
    step: 0,
  }),
  // No time limit: the clock only counts for the speed points.
  tick: (s) => s,
  view: (s, _c, { now }) =>
    s.phase === "playing"
      ? { kind: "playing", size: s.size, board: s.start, elapsedMs: Math.max(0, now - s.startedAt) }
      : { kind: "done", size: s.size, tookMs: s.tookMs, moves: s.moves },
  move(s, _c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    if (s.phase !== "playing") return fail("This puzzle is over.");
    // Replay every tap from the start the server dealt (S21-AC2).
    let board = s.start;
    for (const tile of parsed.data.taps) {
      const next = slide(board, s.size, tile);
      if (!next) return fail("One of those slides isn't possible.");
      board = next;
    }
    if (!isSolved(board)) return fail("The tiles aren't in order yet.");
    return {
      ok: true,
      state: {
        ...s,
        phase: "solved",
        tookMs: now - s.startedAt,
        moves: parsed.data.taps.length,
        step: s.step + 1,
      },
    };
  },
  isOver: (s) => s.phase !== "playing",
  score: (s, points) => (s.tookMs === null ? 0 : Math.round(points * slideShare(s.tookMs))),
  step: (s) => s.step,
};
