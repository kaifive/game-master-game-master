import { z } from "zod";
import type { GameLogic, MoveResult } from "../model";
import { seededRandom } from "../random";
import { solveAndSpeedShare } from "../speed";
import { checkPlacements, cutBoard, rotate, type Piece } from "./puzzle";

/** Block Fit (spec 22): fit chunky grid pieces into a rectangle. */
export const BlocksContent = z
  .object({
    width: z.number().int().min(4).max(6).optional(),
    height: z.number().int().min(4).max(6).optional(),
  })
  .strict();
export type BlocksContent = z.infer<typeof BlocksContent>;

/** All the speed points within this; none at SLOW_MS (S22-AC3). */
export const FAST_MS = 30_000;
export const SLOW_MS = 180_000;

export type BlocksState = {
  width: number;
  height: number;
  /** As the phone shows them: already turned a random way. */
  pieces: Piece[];
  startedAt: number;
  phase: "playing" | "solved";
  tookMs: number | null;
  step: number;
};

export type BlocksView =
  | { kind: "playing"; width: number; height: number; pieces: Piece[]; elapsedMs: number }
  | { kind: "done"; width: number; height: number; tookMs: number | null; pieces: number };

const Move = z.object({
  type: z.literal("solve"),
  placements: z
    .array(
      z.object({
        piece: z.number().int().min(0).max(40),
        turns: z.number().int().min(0).max(3),
        row: z.number().int().min(-6).max(12),
        col: z.number().int().min(-6).max(12),
      }),
    )
    .max(40),
});
const fail = (message: string): MoveResult<BlocksState> => ({ ok: false, message });

export const blocksShare = (tookMs: number) => solveAndSpeedShare(tookMs, FAST_MS, SLOW_MS);

export const blocks: GameLogic<BlocksContent, BlocksState, BlocksView> = {
  content: BlocksContent,
  instructions: () => ({
    title: "How to play",
    lines: [
      "Fill the board with every piece.",
      "Drag a piece onto the board. Tap a piece in the tray to turn it.",
      "Tap a placed piece to take it back off.",
      "Solving it scores half the points. Solving it fast scores the rest.",
    ],
  }),
  create(c, seed, { now }) {
    const width = c.width ?? 5;
    const height = c.height ?? 4;
    const turn = seededRandom(seed ^ 0x5bd1e995);
    const pieces = cutBoard(width, height, seed).map((p) => ({
      id: p.id,
      cells: rotate(p.cells, Math.floor(turn() * 4)),
    }));
    return { width, height, pieces, startedAt: now, phase: "playing", tookMs: null, step: 0 };
  },
  // No time limit: the clock only counts for the speed points.
  tick: (s) => s,
  view: (s, _c, { now }) =>
    s.phase === "playing"
      ? {
          kind: "playing",
          width: s.width,
          height: s.height,
          pieces: s.pieces,
          elapsedMs: Math.max(0, now - s.startedAt),
        }
      : {
          kind: "done",
          width: s.width,
          height: s.height,
          tookMs: s.tookMs,
          pieces: s.pieces.length,
        },
  move(s, _c, raw, { now }) {
    const parsed = Move.safeParse(raw);
    if (!parsed.success) return fail("That move isn't part of this game.");
    if (s.phase !== "playing") return fail("This puzzle is over.");
    const why = checkPlacements(s.width, s.height, s.pieces, parsed.data.placements);
    if (why) return fail(why);
    return {
      ok: true,
      state: { ...s, phase: "solved", tookMs: now - s.startedAt, step: s.step + 1 },
    };
  },
  isOver: (s) => s.phase !== "playing",
  score: (s, points) => (s.tookMs === null ? 0 : Math.round(points * blocksShare(s.tookMs))),
  step: (s) => s.step,
};
